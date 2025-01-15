from blarify.project_graph_creator import ProjectGraphCreator
from blarify.project_file_explorer import ProjectFilesIterator
from blarify.project_file_explorer import ProjectFileStats
from blarify.project_graph_updater import ProjectGraphUpdater, UpdatedFile
from blarify.project_graph_diff_creator import ProjectGraphDiffCreator, FileDiff, ChangeType
from blarify.db_managers.neo4j_manager import Neo4jManager
from blarify.code_references import LspQueryHelper
from blarify.graph.graph_environment import GraphEnvironment
from blarify.utils.file_remover import FileRemover

import dotenv
import os


def main(root_path: str = None, blarignore_path: str = None):
    lsp_query_helper = LspQueryHelper(root_uri=root_path)

    lsp_query_helper.start()

    project_files_iterator = ProjectFilesIterator(
        root_path=root_path,
        blarignore_path=blarignore_path,
    )

    ProjectFileStats(project_files_iterator).print(limit=10)

    FileRemover.soft_delete_if_exists(root_path, "Gemfile")

    repoId = "test"
    entity_id = "test"
    graph_manager = Neo4jManager(repoId, entity_id)

    graph_creator = ProjectGraphCreator(
        root_path, lsp_query_helper, project_files_iterator, GraphEnvironment("dev", "MAIN", root_path)
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


def main_graph_subtraction(graph_a_path: str, graph_b_path: str, blarignore_path: str = None):
    lsp_query_helper_a = LspQueryHelper(root_uri=graph_a_path)
    lsp_query_helper_a.start()

    lsp_query_helper_b = LspQueryHelper(root_uri=graph_b_path)
    lsp_query_helper_b.start()

    project_files_iterator_a = ProjectFilesIterator(
        root_path=graph_a_path,
        blarignore_path=blarignore_path,
    )

    project_files_iterator_b = ProjectFilesIterator(
        root_path=graph_b_path,
        blarignore_path=blarignore_path,
    )

    FileRemover.soft_delete_if_exists(graph_a_path, "Gemfile")
    FileRemover.soft_delete_if_exists(graph_b_path, "Gemfile")

    repoId = "test"
    entity_id = "test"
    graph_manager = Neo4jManager(repoId, entity_id)

    graph_creator_a = ProjectGraphCreator(
        root_path=graph_a_path,
        lsp_query_helper=lsp_query_helper_a,
        project_files_iterator=project_files_iterator_a,
        graph_environment=GraphEnvironment("dev", "MAIN", graph_a_path),
    )

    graph = graph_creator_a.build_hierarchy_only()
    graph_manager.save_graph(graph.get_nodes_as_objects(), graph.get_relationships_as_objects())

    graph_diff_creator = ProjectGraphDiffCreator(
        root_path=graph_b_path,
        lsp_query_helper=lsp_query_helper_b,
        project_files_iterator=project_files_iterator_b,
        file_diffs=[],
        graph_environment=GraphEnvironment("dev", "MAIN", graph_b_path),
        pr_environment=GraphEnvironment("dev", "pr-123", graph_b_path),
        previous_graph=graph,
    )

    graph = graph_diff_creator.build()

    relationships = graph.get_relationships_as_objects()
    nodes = graph.get_nodes_as_objects()

    graph_manager.save_graph(nodes, relationships)
    graph_manager.close()

    lsp_query_helper_a.shutdown_exit_close()
    lsp_query_helper_b.shutdown_exit_close()


def main_diff_with_delta(graph_a_path: str, graph_b_path: str, blarignore_path: str = None, file_diffs: list = None):
    lsp_query_helper = LspQueryHelper(root_uri=graph_b_path)
    lsp_query_helper.start()

    project_files_iterator = ProjectFilesIterator(
        root_path=graph_b_path,
        blarignore_path=blarignore_path,
    )

    repoId = "test"
    entity_id = "test"

    prev_graph = ProjectGraphCreator(
        root_path=graph_b_path,
        lsp_query_helper=lsp_query_helper,
        project_files_iterator=project_files_iterator,
        graph_environment=GraphEnvironment("dev", "MAIN", graph_b_path),
    ).build_hierarchy_only()

    lsp_query_helper.shutdown_exit_close()

    lsp_query_helper = LspQueryHelper(root_uri=graph_a_path)
    lsp_query_helper.start()

    project_files_iterator = ProjectFilesIterator(
        root_path=graph_a_path,
        blarignore_path=blarignore_path,
    )

    repoId = "test"
    entity_id = "test"
    graph_manager = Neo4jManager(repoId, entity_id)

    graph_diff_creator = ProjectGraphDiffCreator(
        root_path=graph_a_path,
        lsp_query_helper=lsp_query_helper,
        project_files_iterator=project_files_iterator,
        file_diffs=file_diffs,
        graph_environment=GraphEnvironment("dev", "MAIN", graph_a_path),
        pr_environment=GraphEnvironment("dev", "pr-123", graph_a_path),
    )

    graph = graph_diff_creator.build_with_graph_delta_relationships(previous_graph=prev_graph)

    relationships = graph.get_relationships_as_objects()
    # nodes = graph.get_nodes_as_objects()
    nodes = []

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
    root_path_2 = os.getenv("ROOT_PATH_2")
    blarignore_path = os.getenv("BLARIGNORE_PATH")
    # main(root_path=root_path, blarignore_path=blarignore_path)
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

    print("Updating")
    # main_update(
    #     updated_files=[
    #         UpdatedFile(
    #             path="file:///home/juan/devel/blar/git-webhook-tester/app/test/main.py",
    #         ),
    #     ],
    #     root_uri=root_path,
    #     blarignore_path=blarignore_path,
    # )

    main_diff_with_delta(
        graph_a_path=root_path,
        graph_b_path=root_path_2,
        blarignore_path=blarignore_path,
        file_diffs=[
            FileDiff(
                path="file:///home/juan/devel/blar/blar-qa/blar/agents/tasks.py",
                diff_text="diff+++",
                change_type=ChangeType.MODIFIED,
            ),
        ],
    )
