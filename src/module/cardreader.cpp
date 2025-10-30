#include "cardreader.h"
#include "common.h"

#include <cassert>
#include <cstring>
#include <vector>

Napi::FunctionReference CardReader::constructor;

void CardReader::init(Napi::Env env, Napi::Object target)
{
  Napi::Function func = DefineClass(
      env,
      "CardReader",
      {
          InstanceMethod("get_status", &CardReader::GetStatus),   // CardReader::GetStatus
          InstanceMethod("_connect", &CardReader::Connect),       // CardReader::Connect
          InstanceMethod("_disconnect", &CardReader::Disconnect), // CardReader::Disconnect
          InstanceMethod("_transmit", &CardReader::Transmit),     // CardReader::Transmit
          InstanceMethod("_control", &CardReader::Control),       // CardReader::Control
          InstanceMethod("close", &CardReader::Close),            // CardReader::Close

          InstanceValue("IOCTL_CCID_ESCAPE", Napi::Number::New(env, IOCTL_CCID_ESCAPE), napi_enumerable), // CardReader::IOCTL_CCID_ESCAPE

          InstanceValue("SCARD_PROTOCOL_RAW", Napi::Number::New(env, SCARD_PROTOCOL_RAW), napi_enumerable), // CardReader::SCARD_PROTOCOL_RAW
          InstanceValue("SCARD_PROTOCOL_T0", Napi::Number::New(env, SCARD_PROTOCOL_T0), napi_enumerable),   // CardReader::SCARD_PROTOCOL_T0
          InstanceValue("SCARD_PROTOCOL_T1", Napi::Number::New(env, SCARD_PROTOCOL_T1), napi_enumerable),   // CardReader::SCARD_PROTOCOL_T1

          InstanceValue("SCARD_SHARE_DIRECT", Napi::Number::New(env, SCARD_SHARE_DIRECT), napi_enumerable),       // CardReader::SCARD_SHARE_DIRECT
          InstanceValue("SCARD_SHARE_EXCLUSIVE", Napi::Number::New(env, SCARD_SHARE_EXCLUSIVE), napi_enumerable), // CardReader::SCARD_SHARE_EXCLUSIVE
          InstanceValue("SCARD_SHARE_SHARED", Napi::Number::New(env, SCARD_SHARE_SHARED), napi_enumerable),       // CardReader::SCARD_SHARE_SHARED

          InstanceValue("SCARD_STATE_ATRMATCH", Napi::Number::New(env, SCARD_STATE_ATRMATCH), napi_enumerable),       // CardReader::SCARD_STATE_ATRMATCH
          InstanceValue("SCARD_STATE_CHANGED", Napi::Number::New(env, SCARD_STATE_CHANGED), napi_enumerable),         // CardReader::SCARD_STATE_CHANGED
          InstanceValue("SCARD_STATE_EMPTY", Napi::Number::New(env, SCARD_STATE_EMPTY), napi_enumerable),             // CardReader::SCARD_STATE_EMPTY
          InstanceValue("SCARD_STATE_EXCLUSIVE", Napi::Number::New(env, SCARD_STATE_EXCLUSIVE), napi_enumerable),     // CardReader::SCARD_STATE_EXCLUSIVE
          InstanceValue("SCARD_STATE_IGNORE", Napi::Number::New(env, SCARD_STATE_IGNORE), napi_enumerable),           // CardReader::SCARD_STATE_IGNORE
          InstanceValue("SCARD_STATE_INUSE", Napi::Number::New(env, SCARD_STATE_INUSE), napi_enumerable),             // CardReader::SCARD_STATE_INUSE
          InstanceValue("SCARD_STATE_MUTE", Napi::Number::New(env, SCARD_STATE_MUTE), napi_enumerable),               // CardReader::SCARD_STATE_MUTE
          InstanceValue("SCARD_STATE_PRESENT", Napi::Number::New(env, SCARD_STATE_PRESENT), napi_enumerable),         // CardReader::SCARD_STATE_PRESENT
          InstanceValue("SCARD_STATE_UNAVAILABLE", Napi::Number::New(env, SCARD_STATE_UNAVAILABLE), napi_enumerable), // CardReader::SCARD_STATE_UNAVAILABLE
          InstanceValue("SCARD_STATE_UNAWARE", Napi::Number::New(env, SCARD_STATE_UNAWARE), napi_enumerable),         // CardReader::SCARD_STATE_UNAWARE
          InstanceValue("SCARD_STATE_UNKNOWN", Napi::Number::New(env, SCARD_STATE_UNKNOWN), napi_enumerable),         // CardReader::SCARD_STATE_UNKNOWN

          InstanceValue("SCARD_EJECT_CARD", Napi::Number::New(env, SCARD_EJECT_CARD), napi_enumerable),     // CardReader::SCARD_EJECT_CARD
          InstanceValue("SCARD_LEAVE_CARD", Napi::Number::New(env, SCARD_LEAVE_CARD), napi_enumerable),     // CardReader::SCARD_LEAVE_CARD
          InstanceValue("SCARD_RESET_CARD", Napi::Number::New(env, SCARD_RESET_CARD), napi_enumerable),     // CardReader::SCARD_RESET_CARD
          InstanceValue("SCARD_UNPOWER_CARD", Napi::Number::New(env, SCARD_UNPOWER_CARD), napi_enumerable), // CardReader::SCARD_UNPOWER_CARD
      });

  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();
  target.Set("CardReader", func);
}

CardReader::CardReader(const Napi::CallbackInfo &info)
    : Napi::ObjectWrap<CardReader>(info),
      m_card_context(0),
      m_status_card_context(0),
      m_card_handle(0),
      m_name(""),
      m_status_thread(0),
      m_state(0)
{
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !info[0].IsString())
  {
    Napi::TypeError::New(env, "First argument must be a string").ThrowAsJavaScriptException();
    return;
  }

  m_name = info[0].As<Napi::String>().Utf8Value();

  assert(uv_mutex_init(&m_mutex) == 0);
  assert(uv_cond_init(&m_cond) == 0);

  Napi::Object self = info.This().As<Napi::Object>();
  self.Set("name", info[0]);
  self.Set("connected", Napi::Boolean::New(env, false));
}

CardReader::~CardReader()
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

Napi::Value CardReader::GetStatus(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !info[0].IsFunction())
  {
    Napi::TypeError::New(env, "First argument must be a callback function").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  Napi::Function cb = info[0].As<Napi::Function>();
  AsyncBaton *async_baton = new AsyncBaton(env, this, cb);

  uv_async_init(uv_default_loop(), &async_baton->async, HandleReaderStatusChange);
  async_baton->async.data = async_baton;
  int ret = uv_thread_create(&m_status_thread, HandlerFunction, async_baton);
  assert(ret == 0);

  return env.Undefined();
}

Napi::Value CardReader::Connect(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();

  if (info.Length() < 3 || !info[0].IsNumber())
  {
    Napi::TypeError::New(env, "First argument must be an integer").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!info[1].IsNumber())
  {
    Napi::TypeError::New(env, "Second argument must be an integer").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!info[2].IsFunction())
  {
    Napi::TypeError::New(env, "Third argument must be a callback function").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  ConnectInput *ci = new ConnectInput();
  ci->share_mode = info[0].As<Napi::Number>().Uint32Value();
  ci->pref_protocol = info[1].As<Napi::Number>().Uint32Value();

  Napi::Function cb = info[2].As<Napi::Function>();
  Baton *baton = new Baton(env, this, cb);
  baton->input = ci;

  int status = uv_queue_work(uv_default_loop(),
                             &baton->request,
                             DoConnect,
                             AfterConnect);
  assert(status == 0);

  return env.Undefined();
}

Napi::Value CardReader::Disconnect(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();

  if (info.Length() < 2 || !info[0].IsNumber())
  {
    Napi::TypeError::New(env, "First argument must be an integer").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!info[1].IsFunction())
  {
    Napi::TypeError::New(env, "Second argument must be a callback function").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  DWORD disposition = info[0].As<Napi::Number>().Uint32Value();

  Napi::Function cb = info[1].As<Napi::Function>();
  Baton *baton = new Baton(env, this, cb);
  baton->input = reinterpret_cast<void *>(new DWORD(disposition));

  int status = uv_queue_work(uv_default_loop(),
                             &baton->request,
                             DoDisconnect,
                             AfterDisconnect);
  assert(status == 0);

  return env.Undefined();
}

Napi::Value CardReader::Transmit(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();

  if (info.Length() < 4 || !info[0].IsBuffer())
  {
    Napi::TypeError::New(env, "First argument must be a Buffer").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!info[1].IsNumber())
  {
    Napi::TypeError::New(env, "Second argument must be an integer").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!info[2].IsNumber())
  {
    Napi::TypeError::New(env, "Third argument must be an integer").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!info[3].IsFunction())
  {
    Napi::TypeError::New(env, "Fourth argument must be a callback function").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  Napi::Buffer<uint8_t> buffer_data = info[0].As<Napi::Buffer<uint8_t>>();
  uint32_t out_len = info[1].As<Napi::Number>().Uint32Value();
  uint32_t protocol = info[2].As<Napi::Number>().Uint32Value();

  Napi::Function cb = info[3].As<Napi::Function>();
  Baton *baton = new Baton(env, this, cb);

  TransmitInput *ti = new TransmitInput();
  ti->card_protocol = protocol;
  ti->in_data = new unsigned char[buffer_data.Length()];
  ti->in_len = buffer_data.Length();
  ti->out_len = out_len;
  std::memcpy(ti->in_data, buffer_data.Data(), ti->in_len);

  baton->input = ti;
  baton->result = nullptr;

  int status = uv_queue_work(uv_default_loop(),
                             &baton->request,
                             DoTransmit,
                             AfterTransmit);
  assert(status == 0);

  return env.Undefined();
}

Napi::Value CardReader::Control(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();

  if (info.Length() < 4 || !info[0].IsBuffer())
  {
    Napi::TypeError::New(env, "First argument must be a Buffer").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!info[1].IsNumber())
  {
    Napi::TypeError::New(env, "Second argument must be an integer").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!info[2].IsBuffer())
  {
    Napi::TypeError::New(env, "Third argument must be a Buffer").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!info[3].IsFunction())
  {
    Napi::TypeError::New(env, "Fourth argument must be a callback function").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  Napi::Buffer<uint8_t> in_buf = info[0].As<Napi::Buffer<uint8_t>>();
  DWORD control_code = info[1].As<Napi::Number>().Uint32Value();
  Napi::Buffer<uint8_t> out_buf = info[2].As<Napi::Buffer<uint8_t>>();

  Napi::Function cb = info[3].As<Napi::Function>();
  Baton *baton = new Baton(env, this, cb);

  ControlInput *ci = new ControlInput();
  ci->control_code = control_code;
  ci->in_data = in_buf.Data();
  ci->in_len = in_buf.Length();
  ci->out_data = out_buf.Data();
  ci->out_len = out_buf.Length();

  baton->input = ci;
  baton->result = nullptr;

  int status = uv_queue_work(uv_default_loop(),
                             &baton->request,
                             DoControl,
                             AfterControl);
  assert(status == 0);

  return env.Undefined();
}

Napi::Value CardReader::Close(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();

  LONG result = (LONG)SCARD_S_SUCCESS;

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
        result = (LONG)SCardCancel(m_status_card_context);
        ret = uv_cond_timedwait(&m_cond, &m_mutex, 10000000);
      } while ((ret != 0) && (++times < 5));
    }

    uv_mutex_unlock(&m_mutex);
    assert(uv_thread_join(&m_status_thread) == 0);
    m_status_thread = 0;
  }

  return Napi::Number::New(env, result);
}

void CardReader::HandleReaderStatusChange(uv_async_t *handle)
{
  AsyncBaton *async_baton = static_cast<AsyncBaton *>(handle->data);
  Napi::Env env = async_baton->env;
  Napi::HandleScope scope(env);

  CardReader *reader = async_baton->reader;

  if (reader->m_status_thread)
  {
    uv_mutex_lock(&reader->m_mutex);
  }

  AsyncResult *ar = async_baton->async_result;

  Napi::Object receiver = reader->Value();

  if (reader->m_state == 1)
  {
    // Swallow events: listening thread was cancelled by user.
  }
  else if (
      ar->result == (LONG)SCARD_S_SUCCESS ||
      ar->result == (LONG)SCARD_E_NO_READERS_AVAILABLE ||
      ar->result == (LONG)SCARD_E_UNKNOWN_READER)
  {
    if (ar->status != 0)
    {
      std::vector<napi_value> args = {
          env.Undefined(),
          Napi::Number::New(env, ar->status),
          Napi::Buffer<uint8_t>::Copy(env, ar->atr, ar->atrlen)};

      async_baton->callback.Call(receiver, args);
    }
  }
  else
  {
    Napi::Error err = Napi::Error::New(env, error_msg("SCardGetStatusChange", ar->result));
    std::vector<napi_value> args = {err.Value()};
    async_baton->callback.Call(receiver, args);
  }

  if (ar->do_exit)
  {
    uv_close(reinterpret_cast<uv_handle_t *>(&async_baton->async), CloseCallback);

    Napi::Value emitValue = receiver.Get("emit");
    if (emitValue.IsFunction())
    {
      Napi::Function emit = emitValue.As<Napi::Function>();
      emit.Call(receiver, {Napi::String::New(env, "_end")});
    }
  }

  if (reader->m_status_thread)
  {
    uv_mutex_unlock(&reader->m_mutex);
  }
}

void CardReader::HandlerFunction(void *arg)
{
  AsyncBaton *async_baton = static_cast<AsyncBaton *>(arg);
  CardReader *reader = async_baton->reader;
  async_baton->async_result = new AsyncResult();
  async_baton->async_result->do_exit = false;

  LONG result = (LONG)SCardEstablishContext(SCARD_SCOPE_SYSTEM, NULL, NULL, &reader->m_status_card_context);

  SCARD_READERSTATE card_reader_state = SCARD_READERSTATE();
  card_reader_state.szReader = reader->m_name.c_str();
  card_reader_state.dwCurrentState = SCARD_STATE_UNAWARE;

  while (!reader->m_state)
  {
    result = (LONG)SCardGetStatusChange(reader->m_status_card_context, INFINITE, &card_reader_state, 1);

    uv_mutex_lock(&reader->m_mutex);
    if (reader->m_state == 1)
    {
      uv_cond_signal(&reader->m_cond);
    }
    else if (result != (LONG)SCARD_S_SUCCESS)
    {
      reader->m_state = 2;
    }

    async_baton->async_result->do_exit = (reader->m_state != 0);
    async_baton->async_result->result = result;
    if (card_reader_state.dwEventState == card_reader_state.dwCurrentState)
    {
      async_baton->async_result->status = 0;
    }
    else
    {
      async_baton->async_result->status = card_reader_state.dwEventState;
    }
    std::memcpy(async_baton->async_result->atr, card_reader_state.rgbAtr, card_reader_state.cbAtr);
    async_baton->async_result->atrlen = card_reader_state.cbAtr;

    uv_mutex_unlock(&reader->m_mutex);

    uv_async_send(&async_baton->async);
    card_reader_state.dwCurrentState = card_reader_state.dwEventState;
  }
}

void CardReader::DoConnect(uv_work_t *req)
{
  Baton *baton = static_cast<Baton *>(req->data);
  ConnectInput *ci = static_cast<ConnectInput *>(baton->input);

  DWORD card_protocol = 0;
  LONG result = (LONG)SCARD_S_SUCCESS;
  CardReader *obj = baton->reader;

  uv_mutex_lock(&obj->m_mutex);
  if (!obj->m_card_context)
  {
    result = (LONG)SCardEstablishContext(SCARD_SCOPE_SYSTEM, NULL, NULL, &obj->m_card_context);
  }

  if (result == (LONG)SCARD_S_SUCCESS)
  {
    result = (LONG)SCardConnect(obj->m_card_context,
                                obj->m_name.c_str(),
                                ci->share_mode,
                                ci->pref_protocol,
                                &obj->m_card_handle,
                                &card_protocol);
  }

  if (result == (LONG)SCARD_S_SUCCESS)
  {
    result = (LONG)SCardStatus(obj->m_card_handle,
                               NULL,
                               NULL,
                               NULL,
                               &card_protocol,
                               NULL,
                               NULL);
  }

  uv_mutex_unlock(&obj->m_mutex);

  ConnectResult *res = new ConnectResult();
  res->result = result;
  res->card_protocol = card_protocol;
  baton->result = res;
}

void CardReader::AfterConnect(uv_work_t *req, int /*status*/)
{
  Baton *baton = static_cast<Baton *>(req->data);
  ConnectResult *result = static_cast<ConnectResult *>(baton->result);
  CardReader *reader = baton->reader;
  Napi::Env env = baton->env;
  Napi::HandleScope scope(env);

  Napi::Object receiver = reader->Value();

  if (result->result)
  {
    Napi::Error err = Napi::Error::New(env, error_msg("SCardConnect", result->result));
    std::vector<napi_value> args = {err.Value()};
    baton->callback.Call(receiver, args);
  }
  else
  {
    receiver.Set("connected", Napi::Boolean::New(env, true));
    std::vector<napi_value> args = {
        env.Null(),
        Napi::Number::New(env, result->card_protocol)};
    baton->callback.Call(receiver, args);
  }

  baton->callback.Reset();
  delete static_cast<ConnectInput *>(baton->input);
  delete result;
  delete baton;
}

void CardReader::DoDisconnect(uv_work_t *req)
{
  Baton *baton = static_cast<Baton *>(req->data);
  DWORD *disposition = reinterpret_cast<DWORD *>(baton->input);
  CardReader *obj = baton->reader;
  LONG result = (LONG)SCARD_E_INVALID_HANDLE;

  uv_mutex_lock(&obj->m_mutex);
  if (obj->m_card_handle)
  {
    result = SCardDisconnect(obj->m_card_handle, *disposition);
    obj->m_card_handle = 0;
  }
  if ((result == (LONG)SCARD_S_SUCCESS) && obj->m_card_context)
  {
    SCardReleaseContext(obj->m_card_context);
    obj->m_card_context = 0;
  }
  uv_mutex_unlock(&obj->m_mutex);

  baton->result = reinterpret_cast<void *>(new LONG(result));
}

void CardReader::AfterDisconnect(uv_work_t *req, int /*status*/)
{
  Baton *baton = static_cast<Baton *>(req->data);
  LONG *result = reinterpret_cast<LONG *>(baton->result);
  CardReader *reader = baton->reader;
  Napi::Env env = baton->env;
  Napi::HandleScope scope(env);

  Napi::Object receiver = reader->Value();

  if (*result)
  {
    Napi::Error err = Napi::Error::New(env, error_msg("SCardDisconnect", *result));
    std::vector<napi_value> args = {err.Value()};
    baton->callback.Call(receiver, args);
  }
  else
  {
    receiver.Set("connected", Napi::Boolean::New(env, false));
    std::vector<napi_value> args = {env.Null()};
    baton->callback.Call(receiver, args);
  }

  baton->callback.Reset();
  delete reinterpret_cast<DWORD *>(baton->input);
  delete result;
  delete baton;
}

void CardReader::DoTransmit(uv_work_t *req)
{
  Baton *baton = static_cast<Baton *>(req->data);
  TransmitInput *ti = static_cast<TransmitInput *>(baton->input);
  CardReader *obj = baton->reader;

  TransmitResult *tr = new TransmitResult();
  tr->data = new unsigned char[ti->out_len];
  tr->len = ti->out_len;
  LONG result = (LONG)SCARD_E_INVALID_HANDLE;

  uv_mutex_lock(&obj->m_mutex);
  if (obj->m_card_handle)
  {
    SCARD_IO_REQUEST send_pci = {ti->card_protocol, sizeof(SCARD_IO_REQUEST)};
    result = (LONG)SCardTransmit(obj->m_card_handle,
                                 &send_pci,
                                 ti->in_data,
                                 ti->in_len,
                                 NULL,
                                 tr->data,
                                 &tr->len);
  }
  uv_mutex_unlock(&obj->m_mutex);

  tr->result = result;
  baton->result = tr;
}

void CardReader::AfterTransmit(uv_work_t *req, int /*status*/)
{
  Baton *baton = static_cast<Baton *>(req->data);
  TransmitInput *ti = static_cast<TransmitInput *>(baton->input);
  TransmitResult *tr = static_cast<TransmitResult *>(baton->result);
  CardReader *reader = baton->reader;
  Napi::Env env = baton->env;
  Napi::HandleScope scope(env);

  Napi::Object receiver = reader->Value();

  if (tr->result)
  {
    Napi::Error err = Napi::Error::New(env, error_msg("SCardTransmit", tr->result));
    std::vector<napi_value> args = {err.Value()};
    baton->callback.Call(receiver, args);
  }
  else
  {
    std::vector<napi_value> args = {
        env.Null(),
        Napi::Buffer<uint8_t>::Copy(env, tr->data, tr->len)};
    baton->callback.Call(receiver, args);
  }

  baton->callback.Reset();
  delete[] ti->in_data;
  delete ti;
  delete[] tr->data;
  delete tr;
  delete baton;
}

void CardReader::DoControl(uv_work_t *req)
{
  Baton *baton = static_cast<Baton *>(req->data);
  ControlInput *ci = static_cast<ControlInput *>(baton->input);
  CardReader *obj = baton->reader;

  ControlResult *cr = new ControlResult();
  LONG result = (LONG)SCARD_E_INVALID_HANDLE;

  uv_mutex_lock(&obj->m_mutex);
  if (obj->m_card_handle)
  {
    result = (LONG)SCardControl(obj->m_card_handle,
                                ci->control_code,
                                ci->in_data,
                                ci->in_len,
                                ci->out_data,
                                ci->out_len,
                                &cr->len);
  }
  uv_mutex_unlock(&obj->m_mutex);

  cr->result = result;
  baton->result = cr;
}

void CardReader::AfterControl(uv_work_t *req, int /*status*/)
{
  Baton *baton = static_cast<Baton *>(req->data);
  ControlInput *ci = static_cast<ControlInput *>(baton->input);
  ControlResult *cr = static_cast<ControlResult *>(baton->result);
  CardReader *reader = baton->reader;
  Napi::Env env = baton->env;
  Napi::HandleScope scope(env);

  Napi::Object receiver = reader->Value();

  if (cr->result)
  {
    Napi::Error err = Napi::Error::New(env, error_msg("SCardControl", cr->result));
    std::vector<napi_value> args = {err.Value()};
    baton->callback.Call(receiver, args);
  }
  else
  {
    std::vector<napi_value> args = {
        env.Null(),
        Napi::Number::New(env, cr->len)};
    baton->callback.Call(receiver, args);
  }

  baton->callback.Reset();
  delete ci;
  delete cr;
  delete baton;
}

void CardReader::CloseCallback(uv_handle_t *handle)
{
  AsyncBaton *async_baton = static_cast<AsyncBaton *>(handle->data);
  delete async_baton->async_result;
  async_baton->callback.Reset();
  SCardReleaseContext(async_baton->reader->m_status_card_context);
  delete async_baton;
}
