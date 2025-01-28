This repo introduces a method to represent a local code repository as a graph structure. The objective is to allow an LLM to traverse this graph to understand the code logic and flow. Providing the LLM with the power to debug, refactor, and optimize queries.

# Example
<img src="https://raw.githubusercontent.com/blarApp/blarify/refs/heads/main/docs/visualisation.png"></img>
This graph was generated from the code in this repository.

# Quickstart
Get started with blarify by following our quickstart guide:

[➡️ Quickstart Guide](https://github.com/blarApp/blarify/docs/quickstart.md)

# Notes

After some experimentation I have found that Language Servers can be quite slow. For example in solargraph, if the function has many references it can take a long time to return results.


# Future Work
- [x] Gracefully update the graph when new files are added, deleted, or modified
- [ ] Add more language servers
- [ ] Experiment with parallelizing the language server requests

