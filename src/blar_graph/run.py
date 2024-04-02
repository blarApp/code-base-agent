from blar_graph.graph_construction.core.graph_builder import GraphConstructor
from blar_graph.db_managers.neo4j_manager import Neo4jManager

graph_manager = Neo4jManager()
graph_constructor = GraphConstructor(graph_manager, "python")
graph_constructor.build_graph("src")
graph_manager.close()
