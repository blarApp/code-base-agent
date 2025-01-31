# Blarify Quickstart

Welcome to Blarify! This guide will help you get started using Blarify to visualize your codebase.

## Prerequisites

- Python (>=3.10,<=3.12.8)
- [lsp-ws-proxy](https://github.com/qualified/lsp-ws-proxy)
- A graph database instance (we recommend using [FalkorDB](https://falkordb.com/) or [AuraDB](https://neo4j.com/product/auradb/))

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

Start the lsp-ws-proxy with the language servers you want to use on port 5000:
```
./lsp-ws-proxy/target/debug/lsp-ws-proxy --listen 5000 -- solargraph stdio -- jedi-language-server  -- typescript-language-server --stdio
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

If you are using Ruby, remove the Gemfile from the project to avoid problems with the language server

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

This will return a graph object that contains all the nodes and relationships in your codebase

To save them and visualize them in a graph database you can get the nodes and relationships as objects

```python
relationships = graph.get_relationships_as_objects()
nodes = graph.get_nodes_as_objects()
```

this will return a list of dictionaries with the following structure

### Relationship
```python
{
    "sourceId": "hashed_id_of_start_node", # Unique identifier for the start node
    "targetId": "hashed_id_of_end_node", # Unique identifier for the end node
    "type": "relationship_type", # Type of the relationship
    "scopeText": "scope_text", # Text that the relationship is based on
}
```

### Node
```python
{
    "type": "node_type", # File, Class, Function, etc
    "extra_labels": [], # Additional labels for the node
    "attributes": {
        "label": "node_type, # Same as type
        "path": "file://path/to/file", # Path to the file that contains the node
        "node_id": "node_id", # Unique identifier for the node, hashed node path
        "node_path": "path/to/node", # Path to the within the file
        "name": "node_name", # Name of the node
        "level": "node_level", # Level of the node within the file structure
        "hashed_id": "node_id", # Same as node_id
        "diff_identifier": "diff_identifier", # Identifier for the node, this is used when using the PR feature

        # The following attributes may not be present in all nodes
        "start_line": "start_line", # Start line of the node within the file
        "end_line": "end_line", # End line of the node within the file
        "text": "node_text", # Text of the node within the file
    },
}
```

Close the lsp query helper and graph manager

```python
graph_manager.close()
lsp_query_helper.shutdown_exit_close()
```


Example using Neo4j
```python
# Set up the graph manager, this will be used to save the graph to neo4j
repoId = "name_of_your_repo"
entity_id = "owner_of_the_repo"
graph_manager = Neo4jManager(repoId, entity_id)

relationships = graph.get_relationships_as_objects()
nodes = graph.get_nodes_as_objects()

graph_manager.save_graph(nodes, relationships)
```




