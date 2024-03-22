from graph_construction.neo4j_manager import Neo4jManager
from graph_construction.graph_builder import GraphConstructor

graph_manager = Neo4jManager()
graph_constructor = GraphConstructor(graph_manager)
graph_constructor.build_graph("src", "python")
graph_manager.close()
