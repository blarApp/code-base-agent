import traceback
import uuid

from blar_graph.db_managers import Neo4jManager
from blar_graph.graph_construction.core.graph_builder import GraphConstructor

repoId = str(uuid.uuid4())
graph_manager = Neo4jManager(repoId, "test1")

try:
    graph_constructor = GraphConstructor(graph_manager, "python")
    graph_constructor.build_graph("src")
    graph_manager.close()
except Exception as e:
    print(e)
    print(traceback.format_exc())
    graph_manager.close()
