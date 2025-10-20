{
  "targets": [
    {
      "target_name": "pcsclite",
      "sources": [
        "src/addon.cpp",
        "src/pcsclite.cpp",
        "src/cardreader.cpp"
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
      "conditions": [
        [
          "OS=='linux'",
          {
            "include_dirs": [
              "/usr/include/PCSC",
              "<!@(node -p \"require('node-addon-api').include\")"
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
            "include_dirs": [
              "<!@(node -p \"require('node-addon-api').include\")"
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
              "-lWinSCard"
            ],
            "include_dirs": [
              "<!@(node -p \"require('node-addon-api').include\")"
            ]
          }
        ]
      ]
    }
  ]
}
