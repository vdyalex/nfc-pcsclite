#include <napi.h>

#include "pcsclite.h"
#include "cardreader.h"

Napi::Object InitAll(Napi::Env env, Napi::Object exports)
{
  PCSCLite::init(env, exports);
  CardReader::init(env, exports);
  return exports;
}

#if defined(NAPI_VERSION) && NAPI_VERSION >= 8
NAPI_MODULE_INIT()
{
  return InitAll(env, exports);
}
#else
NODE_API_MODULE(pcsclite, InitAll)
#endif
