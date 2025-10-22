{
  "targets": [
    {
      "target_name": "pcsclite",
      "sources": [
        "package/lib/addon.cpp",
        "package/lib/pcsclite.cpp",
        "package/lib/cardreader.cpp"
      ],
      "cflags": [
        "-Wall",
        "-Wextra",
        "-Wno-unused-parameter",
        "-fPIC",
        "-fno-strict-aliasing",
        "-pedantic"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').targets\"):node_addon_api_except_all"
      ],
      "defines": [
        "NAPI_CPP_EXCEPTIONS"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "conditions": [
        [
          "OS=='linux'",
          {
            "include_dirs": [
              "/usr/include/PCSC"
            ],
            "link_settings": {
              "libraries": [
                "-lpcsclite"
              ],
              "library_dirs": [
                "/usr/lib"
              ]
            }
          }
        ],
        [
          "OS=='mac'",
          {
            "cflags+": [
              "-fvisibility=hidden"
            ],
            "libraries": [
              "-framework",
              "PCSC"
            ],
            "xcode_settings": {
              "GCC_SYMBOLS_PRIVATE_EXTERN": "YES"
            }
          }
        ],
        [
          "OS=='win'",
          {
            "libraries": [
              "WinSCard.lib"
            ],
            "msvs_settings": {
              "VCCLCompilerTool": {
                "RuntimeLibrary": 2
              }
            },
            "defines": [
              "USING_WIN_DELAY_LOAD_HOOK"
            ]
          }
        ]
      ]
    }
  ]
}
