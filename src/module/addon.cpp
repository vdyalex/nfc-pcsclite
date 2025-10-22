#include <napi.h>

#include "pcsclite.h"
#include "cardreader.h"

Napi::Object InitAll(Napi::Env env, Napi::Object exports)
{
  PCSCLite::init(env, exports);
  CardReader::init(env, exports);
  return exports;
}

NODE_API_MODULE(pcsclite, InitAll);
