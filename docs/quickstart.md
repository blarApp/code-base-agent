# Blarify Quickstart

Welcome to Blarify! This guide will help you get started using Blarify to visualize your codebase.

## Prerequisites

- Python (>=3.10,<=3.14)
- A graph database instance (we recommend using [FalkorDB](https://falkordb.com/) or [AuraDB](https://neo4j.com/product/auradb/))

## Installation

First set up your virtual environment:
```bash
python -m venv .venv
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

Import GraphBuilder from the prebuilt module

```python
from blarify.prebuilt.graph_builder import GraphBuilder
```

Create the graph builder

You can skip files or directories by passing them in the extensions_to_skip or names_to_skip parameters

```python
graph_builder = GraphBuilder(root_path=PATH_TO_YOUR_PROJECT, extensions_to_skip=[".json"], names_to_skip=["__pycache__"])
```

Build the graph

```python
graph = graph_builder.build()
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

Example using FalkorDB
```python
relationships = graph.get_relationships_as_objects()
nodes = graph.get_nodes_as_objects()

# This assumes you have the following environment variables set:
# NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
graph_manager = Neo4jManager(repo_id="repo", entity_id="organization")

graph_manager.save_graph(nodes, relationships)
graph_manager.close()

```

## Complete Example

```python
# Taken from blarify/examples/graph_builder.py
from blarify.prebuilt.graph_builder import GraphBuilder
from blarify.db_managers.neo4j_manager import Neo4jManager
from blarify.db_managers.falkordb_manager import FalkorDBManager

import dotenv
import os


def build(root_path: str = None):
    graph_builder = GraphBuilder(
        root_path=root_path, extensions_to_skip=[".json"], names_to_skip=["__pycache__"], only_hierarchy=True
    )
    graph = graph_builder.build()

    relationships = graph.get_relationships_as_objects()
    nodes = graph.get_nodes_as_objects()

    save_to_falkordb(relationships, nodes)


def save_to_neo4j(relationships, nodes):
    graph_manager = Neo4jManager(repo_id="repo", entity_id="organization")

    print(f"Saving graph with {len(nodes)} nodes and {len(relationships)} relationships")
    graph_manager.save_graph(nodes, relationships)
    graph_manager.close()


def save_to_falkordb(relationships, nodes):
    graph_manager = FalkorDBManager(repo_id="repo", entity_id="organization")

    print(f"Saving graph with {len(nodes)} nodes and {len(relationships)} relationships")
    graph_manager.save_graph(nodes, relationships)
    graph_manager.close()


if __name__ == "__main__":
    import logging

    logging.basicConfig(level=logging.INFO)

    dotenv.load_dotenv()
    root_path = os.getenv("ROOT_PATH")
    build(root_path=root_path)

```




