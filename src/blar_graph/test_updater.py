import traceback

from blar_graph.db_managers import Neo4jManager
from blar_graph.graph_construction.core.graph_builder import GraphConstructor
from blar_graph.graph_construction.core.graph_updater import GraphUpdater


def create_graph(graph_constructor, graph_manager):
    nodes, relationships = graph_constructor.build_graph()
    graph_manager.save_graph(nodes, relationships)


def update_graph(graph_updater, graph_manager):
    nodes, relationships = graph_updater.build_graph()
    graph_manager.save_graph(nodes, relationships)


def main():
    repoId = "test"
    entity_id = "test-update"
    graph_manager = Neo4jManager(repoId, entity_id)

    try:
        graph_constructor = GraphConstructor(
            root="/home/juan/devel/blar/git-webhook-tester",
            entity_id=entity_id,
            max_workers=100,
        )

        graph_updater = GraphUpdater(
            graph_manager=graph_manager,
            root="/home/juan/devel/blar/git-webhook-tester",
            entity_id=entity_id,
            max_workers=1,
            whitelisted_files=["main.py"],
        )

        create_graph(graph_constructor, graph_manager)
        graph_manager.delete_nodes_by_file_path("/home/juan/devel/blar/git-webhook-tester/main.py")
        update_graph(graph_updater, graph_manager)

        graph_manager.close()
    except Exception as e:
        print(e)
        print(traceback.format_exc())
        graph_manager.close()


if __name__ == "__main__":
    main()
