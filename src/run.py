from graph_construction.neo4j_manager import Neo4jManager
from graph_construction.graph_builder import GraphConstructor

graph_manager = Neo4jManager()
# graph_constructor = GraphConstructor(graph_manager)
# graph_constructor.build_graph("src", "python")
res = graph_manager.get_code("__process_node__")
for record in res:
    neigbours = graph_manager.get_n_hop_neighbours(record['node.node_id'], 1)
    for neighbour in neigbours:
        print(neighbour['text'])

graph_manager.close()
