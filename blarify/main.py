from blarify.project_graph_creator import ProjectGraphCreator
from blarify.project_file_explorer import ProjectFilesIterator
from blarify.project_graph_updater import ProjectGraphUpdater, UpdatedFile
from blarify.project_graph_diff_creator import ProjectGraphDiffCreator, FileDiff, ChangeType
from blarify.db_managers.neo4j_manager import Neo4jManager
from blarify.code_references import LspQueryHelper
from blarify.graph.graph_environment import GraphEnvironment

import dotenv
import os


def main(root_path: str = None, blarignore_path: str = None):
    lsp_query_helper = LspQueryHelper(root_uri=root_path)

    lsp_query_helper.start()

    project_files_iterator = ProjectFilesIterator(
        root_path=root_path,
        blarignore_path=blarignore_path,
    )

    repoId = "test-ruby"
    entity_id = "test"
    graph_manager = Neo4jManager(repoId, entity_id)

    graph_creator = ProjectGraphCreator(
        "Test", lsp_query_helper, project_files_iterator, GraphEnvironment("dev", "MAIN", root_path)
    )

    graph = graph_creator.build()

    relationships = graph.get_relationships_as_objects()
    nodes = graph.get_nodes_as_objects()

    print(f"Saving graph with {len(nodes)} nodes and {len(relationships)} relationships")
    graph_manager.save_graph(nodes, relationships)
    graph_manager.close()

    lsp_query_helper.shutdown_exit_close()


def main_diff(file_diffs: list, root_uri: str = None, blarignore_path: str = None):
    lsp_query_helper = LspQueryHelper(root_uri=root_uri)
    lsp_query_helper.start()

    project_files_iterator = ProjectFilesIterator(
        root_path=root_uri,
        blarignore_path=blarignore_path,
    )

    repoId = "test"
    entity_id = "test"
    graph_manager = Neo4jManager(repoId, entity_id)

    graph_diff_creator = ProjectGraphDiffCreator(
        root_path=root_uri,
        lsp_query_helper=lsp_query_helper,
        project_files_iterator=project_files_iterator,
        file_diffs=file_diffs,
        graph_environment=GraphEnvironment("dev", "MAIN", root_uri),
        pr_environment=GraphEnvironment("dev", "pr-123", root_uri),
    )

    graph = graph_diff_creator.build()

    relationships = graph.get_relationships_as_objects()
    nodes = graph.get_nodes_as_objects()

    print(f"Saving graph with {len(nodes)} nodes and {len(relationships)} relationships")
    graph_manager.save_graph(nodes, relationships)
    graph_manager.close()
    lsp_query_helper.shutdown_exit_close()


def main_update(updated_files: list, root_uri: str = None, blarignore_path: str = None):
    lsp_query_helper = LspQueryHelper(root_uri=root_uri)
    lsp_query_helper.start()

    project_files_iterator = ProjectFilesIterator(
        root_path=root_uri,
        blarignore_path=blarignore_path,
    )

    repoId = "test"
    entity_id = "test"
    graph_manager = Neo4jManager(repoId, entity_id)

    delete_updated_files_from_neo4j(updated_files, graph_manager)

    graph_diff_creator = ProjectGraphUpdater(
        updated_files=updated_files,
        root_path=root_uri,
        lsp_query_helper=lsp_query_helper,
        project_files_iterator=project_files_iterator,
        graph_environment=GraphEnvironment("dev", "MAIN", root_uri),
    )

    graph = graph_diff_creator.build()

    relationships = graph.get_relationships_as_objects()
    nodes = graph.get_nodes_as_objects()

    print(f"Saving graph with {len(nodes)} nodes and {len(relationships)} relationships")
    graph_manager.save_graph(nodes, relationships)
    graph_manager.close()
    lsp_query_helper.shutdown_exit_close()


def delete_updated_files_from_neo4j(updated_files, db_manager: Neo4jManager):
    for updated_file in updated_files:
        db_manager.detatch_delete_nodes_with_path(updated_file.path)


if __name__ == "__main__":
    dotenv.load_dotenv()
    root_path = os.getenv("ROOT_PATH")
    blarignore_path = os.getenv("BLARIGNORE_PATH")
    main(root_path=root_path, blarignore_path=blarignore_path)
    # main_diff(
    #     file_diffs=[
    #         FileDiff(
    #             path="file:///home/juan/devel/blar/lsp-poc/blarify/graph/node/utils/node_factory.py",
    #             diff_text="diff+++",
    #             change_type=ChangeType.ADDED,
    #         ),
    #         FileDiff(
    #             path="file:///home/juan/devel/blar/lsp-poc/blarify/graph/relationship/relationship_type.py",
    #             diff_text="diff+++",
    #             change_type=ChangeType.ADDED,
    #         ),
    #         FileDiff(
    #             path="file:///home/juan/devel/blar/lsp-poc/blarify/graph/relationship/relationship_creator.py",
    #             diff_text="diff+++",
    #             change_type=ChangeType.DELETED,
    #         ),
    #     ],
    #     root_uri=root_path,
    #     blarignore_path=blarignore_path,
    # )
    main_update(
        updated_files=[
            UpdatedFile(
                path="file:///home/juan/devel/blar/lsp-poc/blarify/graph/node/utils/node_factory.py",
            ),
            UpdatedFile(
                path="file:///home/juan/devel/blar/lsp-poc/blarify/graph/relationship/relationship_type.py",
            ),
        ],
        root_uri=root_path,
        blarignore_path=blarignore_path,
    )
