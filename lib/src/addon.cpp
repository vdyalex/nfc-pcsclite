#include <napi.h>

#include "pcsclite.h"
#include "cardreader.h"

Napi::Object init_all(Napi::Env env, Napi::Object exports)
{
    PCSCLite::init(env, exports);
    CardReader::init(env, exports);
    return exports;
}

NODE_API_MODULE(pcsclite, init_all);
