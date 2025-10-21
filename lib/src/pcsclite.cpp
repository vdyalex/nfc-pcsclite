#include <iostream>

#include "pcsclite.h"
#include "common.h"

#include <cassert>
#include <cstring>
#include <cstdio>
#include <vector>

Napi::FunctionReference PCSCLite::constructor;

void PCSCLite::init(Napi::Env env, Napi::Object target)
{
  Napi::Function tpl = DefineClass(env, "PCSCLite", {InstanceMethod("start", &PCSCLite::Start), InstanceMethod("close", &PCSCLite::Close)});

  constructor = Napi::Persistent(tpl);
  constructor.SuppressDestruct();
  target.Set("PCSCLite", tpl);
}

PCSCLite::PCSCLite(const Napi::CallbackInfo &info)
    : Napi::ObjectWrap<PCSCLite>(info),
      m_card_context(0),
      m_card_reader_state(),
      m_status_thread(0),
      m_pnp(false),
      m_state(0),
      m_timeout_ms(5000)
{
  Napi::Env env = info.Env();

  assert(uv_mutex_init(&m_mutex) == 0);
  assert(uv_cond_init(&m_cond) == 0);

  std::cout << "pcsclite native module initialized" << std::endl;

#ifdef _WIN32
  std::cout << "attempt to start the Smart Card service without blocking" << std::endl;

  // Attempt to start the Smart Card service without blocking
  SC_HANDLE scm = OpenSCManager(NULL, NULL, SC_MANAGER_CONNECT | SC_MANAGER_ENUMERATE_SERVICE);
  if (scm)
  {
    std::cout << "smart card manager available" << std::endl;

    SC_HANDLE service = OpenService(scm, "SCardSvr", SERVICE_START);
    if (service)
    {
      std::cout << "starting smart card service" << std::endl;
      StartService(service, 0, NULL);
      std::cout << "closing smart card service handle" << std::endl;
      CloseServiceHandle(service);
    }
    else
    {
      std::cout << "smart card service unavailable" << std::endl;
      Napi::Error::New(env, error_msg("SCardEstablishContext", 0)).ThrowAsJavaScriptException();
    }

    std::cout << "closing smart card manager handle" << std::endl;
    CloseServiceHandle(scm);
  }
  else
  {
    Napi::Error::New(env, error_msg("SCardEstablishContext", 0)).ThrowAsJavaScriptException();
  }
#endif

  LONG result;
  // TODO: consider removing this do-while Windows workaround that should not be needed anymore
  do
  {
    // TODO: make dwScope (now hard-coded to SCARD_SCOPE_SYSTEM) customisable
    result = SCardEstablishContext(SCARD_SCOPE_SYSTEM,
                                   NULL,
                                   NULL,
                                   &m_card_context);
    std::cout << "retring to connect to the smart card" << std::endl;
  } while (result == static_cast<LONG>(SCARD_E_NO_SERVICE) ||
           result == static_cast<LONG>(SCARD_E_SERVICE_STOPPED));

  if (result != SCARD_S_SUCCESS)
  {
    std::cout << "error while trying to connect to the smart card" << std::endl;

    Napi::Error::New(env, error_msg("SCardEstablishContext", result)).ThrowAsJavaScriptException();
    return;
  }
  else
  {
    std::cout << "connected to the smart card" << std::endl;

    m_card_reader_state.szReader = "\\\\?PnP?\\Notification";
    m_card_reader_state.dwCurrentState = SCARD_STATE_UNAWARE;
    result = SCardGetStatusChange(m_card_context,
                                  0,
                                  &m_card_reader_state,
                                  1);

    if ((result != SCARD_S_SUCCESS) && (result != static_cast<LONG>(SCARD_E_TIMEOUT)))
    {
      std::cout << "failed connection with the smart card" << std::endl;
      Napi::Error::New(env, error_msg("SCardGetStatusChange", result)).ThrowAsJavaScriptException();
    }
    else
    {
      std::cout << "successfully connected to the smart card" << std::endl;
      m_pnp = !(m_card_reader_state.dwEventState & SCARD_STATE_UNKNOWN);
    }
  }
}

PCSCLite::~PCSCLite()
{
  if (m_status_thread)
  {
    SCardCancel(m_card_context);
    assert(uv_thread_join(&m_status_thread) == 0);
  }

  if (m_card_context)
  {
    SCardReleaseContext(m_card_context);
  }

  uv_cond_destroy(&m_cond);
  uv_mutex_destroy(&m_mutex);
}

Napi::Value PCSCLite::Start(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !info[0].IsFunction())
  {
    Napi::TypeError::New(env, "First argument must be a callback function").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (info.Length() >= 2 && info[1].IsNumber())
  {
    m_timeout_ms = info[1].As<Napi::Number>().Uint32Value();
  }
  else
  {
    // Default timeout of 5 seconds
    m_timeout_ms = 5000;
  }

  Napi::Function cb = info[0].As<Napi::Function>();
  AsyncBaton *async_baton = new AsyncBaton(env, this, cb);

  uv_async_init(uv_default_loop(), &async_baton->async, HandleReaderStatusChange);
  async_baton->async.data = async_baton;
  int ret = uv_thread_create(&m_status_thread, HandlerFunction, async_baton);
  assert(ret == 0);

  return env.Undefined();
}

Napi::Value PCSCLite::Close(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();

  LONG result = SCARD_S_SUCCESS;
  if (m_pnp)
  {
    if (m_status_thread)
    {
      uv_mutex_lock(&m_mutex);
      if (m_state == 0)
      {
        int ret;
        int times = 0;
        m_state = 1;
        do
        {
          result = SCardCancel(m_card_context);
          ret = uv_cond_timedwait(&m_cond, &m_mutex, 10000000);
        } while ((ret != 0) && (++times < 5));
      }
      uv_mutex_unlock(&m_mutex);
    }
  }
  else
  {
    m_state = 1;
  }

  if (m_status_thread)
  {
    assert(uv_thread_join(&m_status_thread) == 0);
    m_status_thread = 0;
  }

  return Napi::Number::New(env, result);
}

void PCSCLite::HandleReaderStatusChange(uv_async_t *handle)
{
  AsyncBaton *async_baton = static_cast<AsyncBaton *>(handle->data);
  AsyncResult *ar = async_baton->async_result;
  PCSCLite *pcsclite = async_baton->pcsclite;

  Napi::Env env = async_baton->env;
  Napi::HandleScope scope(env);
  Napi::Object receiver = pcsclite->Value();

  if (pcsclite->m_state == 1)
  {
    // Swallow events: listening thread was cancelled by user.
  }
  else if ((ar->result == SCARD_S_SUCCESS) ||
           (ar->result == static_cast<LONG>(SCARD_E_NO_READERS_AVAILABLE)))
  {
    std::vector<napi_value> args = {
        env.Undefined(),
        Napi::Buffer<char>::Copy(env, ar->readers_name, ar->readers_name_length)};

    async_baton->callback.Call(receiver, args);
  }
  else
  {
    Napi::Error err = Napi::Error::New(env, ar->err_msg);
    std::vector<napi_value> args = {err.Value()};
    async_baton->callback.Call(receiver, args);
  }

  // Do exit, after throwing last events
  if (ar->do_exit)
  {
    // necessary otherwise UV will block
    uv_close(reinterpret_cast<uv_handle_t *>(&async_baton->async), CloseCallback);
    return;
  }

#ifdef SCARD_AUTOALLOCATE
  SCardFreeMemory(pcsclite->m_card_context, ar->readers_name);
#else
  delete[] ar->readers_name;
#endif
  ar->readers_name = NULL;
  ar->readers_name_length = 0;
  ar->result = SCARD_S_SUCCESS;
  ar->err_msg.clear();
}

void PCSCLite::HandlerFunction(void *arg)
{
  AsyncBaton *async_baton = static_cast<AsyncBaton *>(arg);
  PCSCLite *pcsclite = async_baton->pcsclite;
  async_baton->async_result = new AsyncResult();
  async_baton->async_result->readers_name = NULL;
  async_baton->async_result->readers_name_length = 0;
  async_baton->async_result->do_exit = false;
  async_baton->async_result->result = SCARD_S_SUCCESS;

  LONG result = SCARD_S_SUCCESS;

  while (!pcsclite->m_state)
  {
    /* Get card readers */
    result = get_card_readers(pcsclite, async_baton->async_result);
    if (result == static_cast<LONG>(SCARD_E_NO_READERS_AVAILABLE))
    {
      result = SCARD_S_SUCCESS;
    }

    /* Store the result in the baton */
    async_baton->async_result->result = result;
    if (result != SCARD_S_SUCCESS)
    {
      async_baton->async_result->err_msg = error_msg("SCardListReaders", result);
    }

    /* Notify the nodejs thread */
    uv_async_send(&async_baton->async);

    if (result == SCARD_S_SUCCESS)
    {
      if (pcsclite->m_pnp)
      {
        /* Set current status */
        pcsclite->m_card_reader_state.dwCurrentState =
            pcsclite->m_card_reader_state.dwEventState;
        /* Start checking for status change */
        result = SCardGetStatusChange(pcsclite->m_card_context,
                                      pcsclite->m_timeout_ms,
                                      &pcsclite->m_card_reader_state,
                                      1);

        uv_mutex_lock(&pcsclite->m_mutex);
        async_baton->async_result->result = result;
        if (pcsclite->m_state)
        {
          uv_cond_signal(&pcsclite->m_cond);
        }

        if (result != SCARD_S_SUCCESS)
        {
          pcsclite->m_state = 2;
          async_baton->async_result->err_msg = error_msg("SCardGetStatusChange", result);
        }

        uv_mutex_unlock(&pcsclite->m_mutex);
      }
      else
      {
        /*  If PnP is not supported, just wait for 1 second */
        Sleep(1000);
      }
    }
    else
    {
      pcsclite->m_state = 2;
    }
  }

  async_baton->async_result->do_exit = true;
  uv_async_send(&async_baton->async);
}

void PCSCLite::CloseCallback(uv_handle_t *handle)
{
  AsyncBaton *async_baton = static_cast<AsyncBaton *>(handle->data);
  AsyncResult *ar = async_baton->async_result;

#ifdef SCARD_AUTOALLOCATE
  PCSCLite *pcsclite = async_baton->pcsclite;
  SCardFreeMemory(pcsclite->m_card_context, ar->readers_name);
#else
  delete[] ar->readers_name;
#endif

  delete ar;
  async_baton->callback.Reset();
  delete async_baton;
}

LONG PCSCLite::get_card_readers(PCSCLite *pcsclite, AsyncResult *async_result)
{
  DWORD readers_name_length;
  LPTSTR readers_name;

  LONG result = SCARD_S_SUCCESS;

  async_result->readers_name = NULL;
  async_result->readers_name_length = 0;

#ifdef SCARD_AUTOALLOCATE
  readers_name_length = SCARD_AUTOALLOCATE;
  result = SCardListReaders(pcsclite->m_card_context,
                            NULL,
                            (LPTSTR)&readers_name,
                            &readers_name_length);
#else
  result = SCardListReaders(pcsclite->m_card_context,
                            NULL,
                            NULL,
                            &readers_name_length);
  if (result != SCARD_S_SUCCESS)
  {
    return result;
  }

  readers_name = new char[readers_name_length];
  result = SCardListReaders(pcsclite->m_card_context,
                            NULL,
                            readers_name,
                            &readers_name_length);
#endif

  if (result != SCARD_S_SUCCESS)
  {
#ifndef SCARD_AUTOALLOCATE
    delete[] readers_name;
#endif
    readers_name = NULL;
    readers_name_length = 0;
#ifndef SCARD_AUTOALLOCATE
    /* Retry in case of insufficient buffer error */
    if (result == static_cast<LONG>(SCARD_E_INSUFFICIENT_BUFFER))
    {
      return get_card_readers(pcsclite, async_result);
    }
#endif
    if (result == static_cast<LONG>(SCARD_E_NO_SERVICE) ||
        result == static_cast<LONG>(SCARD_E_SERVICE_STOPPED))
    {
      SCardReleaseContext(pcsclite->m_card_context);
      SCardEstablishContext(SCARD_SCOPE_SYSTEM, NULL, NULL, &pcsclite->m_card_context);
      return get_card_readers(pcsclite, async_result);
    }
  }
  else
  {
    /* Store the readers_name in the baton */
    async_result->readers_name = readers_name;
    async_result->readers_name_length = readers_name_length;
  }

  return result;
}
