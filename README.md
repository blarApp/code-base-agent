This repo introduces a method to represent a local code repository as a graph structure. The objective is to allow an LLM to traverse this graph to understand the code logic and flow. Providing the LLM with the power to debug, refactor, and optimize queries.

# Language Server proxy initialization
```
./lsp-ws-proxy/target/debug/lsp-ws-proxy --listen 5000 -- solargraph stdio -- jedi-language-server  -- typescript-language-server --stdio
```
