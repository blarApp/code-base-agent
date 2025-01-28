# Blarify Quickstart

Welcome to Blarify! This guide will help you get started using Blarify to visualize your codebase.

## Prerequisites

- Python (>=3.10,<=3.12.8)
- [lsp-ws-proxy](https://github.com/qualified/lsp-ws-proxy)
- A neo4j instance (we recommend using [AuraDB](https://neo4j.com/product/auradb/))

and one or more of the following:

- solargraph (for Ruby support)
- jedi-language-server (for Python support)
- typescript-language-server (for TypeScript/JavaScript support)

## Installation

First set up your virtual environment:
```bash
python3.11 -m venv .venv
source .venv/bin/activate
```

Clone and install the Blarify repository:
```bash
git clone git@github.com:blarApp/blarify.git
pip install blarify/
```

## Usage

```python
PATH_TO_YOUR_PROJECT = "/path/to/your/project/"
```

Start the lsp query helper, this will be used to query the language server for information about your codebase

```python
lsp_query_helper = LspQueryHelper(root_uri=PATH_TO_YOUR_PROJECT)
lsp_query_helper.start()
```



ProjectFilesIterator will iterate over all the files in your project, you can skip files or directories by passing them in the names_to_skip parameter
```python
project_files_iterator = ProjectFilesIterator(
    root_path=PATH_TO_YOUR_PROJECT,
    names_to_skip=[".git", ".idea", ".vscode", "__pycache__", ".pytest_cache"],
)
```

Remove the Gemfile if it exists, solargraph won't work if you have a Gemfile in your project

```python
FileRemover.soft_delete_if_exists(PATH_TO_YOUR_PROJECT, "Gemfile")
```



Create the graph creator and build
```python
graph_creator = ProjectGraphCreator(
    PATH_TO_YOUR_PROJECT, lsp_query_helper, project_files_iterator
)

graph = graph_creator.build()
```


Save the graph to neo4j
```python
# Set up the graph manager, this will be used to save the graph to neo4j
repoId = "name_of_your_repo"
entity_id = "owner_of_the_repo"
graph_manager = Neo4jManager(repoId, entity_id)

relationships = graph.get_relationships_as_objects()
nodes = graph.get_nodes_as_objects()

graph_manager.save_graph(nodes, relationships)
```

Close the graph manager and lsp query helper
```python
graph_manager.close()
lsp_query_helper.shutdown_exit_close()
```


