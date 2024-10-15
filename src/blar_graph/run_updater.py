import traceback

from blar_graph.db_managers import Neo4jManager
from blar_graph.graph_construction.core.graph_builder import GraphConstructor
from blar_graph.graph_construction.core.graph_updater import GraphUpdater


def main():
    repoId = "test"
    entity_id = "test"
    graph_manager = Neo4jManager(repoId, entity_id)

    try:
        graph_constructor = GraphUpdater(
            root="/home/juan/devel/blar/git-webhook-tester",
            entity_id=entity_id,
            max_workers=1,
            whitelisted_files=["main.py"],
            graph_manager=graph_manager,
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
