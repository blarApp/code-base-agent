import traceback

from blar_graph.db_managers import Neo4jManager
from blar_graph.graph_construction.core.graph_builder import GraphConstructor

repoId = "test"
entity_id = "test"
graph_manager = Neo4jManager(repoId, entity_id)


try:
    graph_constructor = GraphConstructor(graph_manager, entity_id)
    nodes, relationships = graph_constructor.build_graph("src")
    graph_manager.save_graph(nodes, relationships)
    graph_manager.close()
except Exception as e:
    print(e)
    print(traceback.format_exc())
    graph_manager.close()
