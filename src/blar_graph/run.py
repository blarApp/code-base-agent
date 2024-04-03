import uuid

from blar_graph.db_managers import Neo4jManager
from blar_graph.graph_construction.core.graph_builder import GraphConstructor

repo_id = str(uuid.uuid4())
graph_manager = Neo4jManager(repo_id)
graph_constructor = GraphConstructor(graph_manager, "python")
graph_constructor.build_graph("src")
graph_manager.close()
