This repo introduces a method to represent a local code repository as a graph structure. The objective is to allow an LLM to traverse this graph to understand the code logic and flow. Providing the LLM with the power to debug, refactor, and optimize queries.

# Language Server proxy initialization
```
./lsp-ws-proxy/target/debug/lsp-ws-proxy --listen 5000 -- solargraph stdio -- jedi-language-server  -- typescript-language-server --stdio
```

# Example
<img src="https://raw.githubusercontent.com/blarApp/lsp-poc/refs/heads/main/docs/visualisation.png"></img>
This graph was generated from a Ruby on Rails project.


# Notes

After some experimentation I have found that Language Servers can be quite slow. For example in solargraph, if the function has many references it can take a long time to return results. 


# Future Work
- [] Add more language servers
- [] Experiment with parallelizing the language server requests
- [] Gracefully update the graph when new files are added, deleted, or modified
