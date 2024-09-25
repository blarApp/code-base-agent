import traceback

from blar_graph.db_managers import Neo4jManager
from blar_graph.graph_construction.core.graph_builder import GraphConstructor


def main():
    repoId = "test"
    entity_id = "test"
    graph_manager = Neo4jManager(repoId, entity_id)

    try:
        graph_constructor = GraphConstructor(
            root="src/blar_graph/examples/repos/ruby",
            entity_id=entity_id,
            max_workers=100,
        )
        nodes, relationships = graph_constructor.build_graph()
        graph_manager.save_graph(nodes, relationships)
        graph_manager.close()
    except Exception as e:
        print(e)
        print(traceback.format_exc())
        graph_manager.close()


if __name__ == "__main__":
    main()
