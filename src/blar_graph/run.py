from blar_graph.db_managers import Neo4jManager
from blar_graph.graph_construction.core.graph_builder import GraphConstructor

graph_manager = Neo4jManager()
graph_constructor = GraphConstructor(graph_manager, "python")
graph_constructor.build_graph("src")
graph_manager.close()
