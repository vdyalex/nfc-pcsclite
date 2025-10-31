#ifndef PCSCLITE_H
#define PCSCLITE_H

#include <napi.h>
#include <uv.h>

#ifdef __APPLE__
#include <PCSC/winscard.h>
#include <PCSC/wintypes.h>
#else
#include <winscard.h>
#endif

class PCSCLite : public Napi::ObjectWrap<PCSCLite>
{
  struct AsyncResult
  {
    LONG result;
    LPSTR readers_name;
    DWORD readers_name_length;
    bool do_exit;
    std::string err_msg;
  };

  struct AsyncBaton
  {
    AsyncBaton(Napi::Env env, PCSCLite *owner, const Napi::Function &callback_fn)
        : async(), env(env), callback(Napi::Persistent(callback_fn)), pcsclite(owner), async_result(nullptr)
    {
      async.data = this;
    }

    uv_async_t async;
    Napi::Env env;
    Napi::FunctionReference callback;
    PCSCLite *pcsclite;
    AsyncResult *async_result;
  };

public:
  static void init(Napi::Env env, Napi::Object target);

  explicit PCSCLite(const Napi::CallbackInfo &info);
  ~PCSCLite() override;

private:
  static Napi::FunctionReference constructor;

  Napi::Value Start(const Napi::CallbackInfo &info);
  Napi::Value Close(const Napi::CallbackInfo &info);

  static void HandleReaderStatusChange(uv_async_t *handle);
  static void HandlerFunction(void *arg);
  static void CloseCallback(uv_handle_t *handle);
  static void ConfigureService();

  static LONG get_card_readers(PCSCLite *pcsclite, AsyncResult *async_result);

private:
  SCARDCONTEXT m_card_context;
  SCARD_READERSTATE m_card_reader_state;
  uv_thread_t m_status_thread;
  uv_mutex_t m_mutex;
  uv_cond_t m_cond;
  bool m_pnp;
  int m_state;
};

#endif /* PCSCLITE_H */
