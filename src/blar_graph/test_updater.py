import traceback

from blar_graph.db_managers import Neo4jManager
from blar_graph.graph_construction.core.graph_builder import GraphConstructor
from blar_graph.graph_construction.core.graph_updater import GraphUpdater


def create_graph(graph_manager, entity_id):
    graph_constructor = GraphConstructor(
        root="/home/juan/devel/blar/git-webhook-tester",
        entity_id=entity_id,
        max_workers=100,
    )

    nodes, relationships = graph_constructor.build_graph()
    graph_manager.save_graph(nodes, relationships)


def delete_nodes(graph_manager, path):
    graph_manager.delete_nodes_by_file_path(path)


def update_graph(graph_manager, entity_id, whitelisted_files):
    graph_updater = GraphUpdater(
        graph_manager=graph_manager,
        root="/home/juan/devel/blar/git-webhook-tester",
        entity_id=entity_id,
        max_workers=1,
        whitelisted_files=whitelisted_files,
    )
    nodes, relationships = graph_updater.build_graph()
    graph_manager.save_graph(nodes, relationships)


def main():
    repoId = "test"
    entity_id = "test-update"
    graph_manager = Neo4jManager(repoId, entity_id)
    graph_manager_clean = Neo4jManager(repoId, entity_id + "_clean")

    try:
        create_graph(graph_manager, entity_id)
        create_graph(graph_manager_clean, entity_id + "_clean")
        delete_nodes(graph_manager, "/home/juan/devel/blar/git-webhook-tester/main.py")
        update_graph(graph_manager, entity_id, ["main.py"])

        graph_manager.close()
    except Exception as e:
        print(e)
        print(traceback.format_exc())
        graph_manager.close()


if __name__ == "__main__":
    main()
