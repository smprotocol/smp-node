{
  "targets": [
    {
      "target_name": "fastparser",
      "sources": [ "src/fastparser.cc" ],
      "include_dirs" : [
        "<!(node -e \"require('nan')\")"
      ]     
    }
  ]
}
