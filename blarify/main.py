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


def delete_updated_files_from_neo4j(updated_files, db_manager: Neo4jManager):
    for updated_file in updated_files:
        db_manager.detatch_delete_nodes_with_path(updated_file.path)


if __name__ == "__main__":
    dotenv.load_dotenv()
    root_path = os.getenv("ROOT_PATH")
    blarignore_path = os.getenv("BLARIGNORE_PATH")
    main(root_path=root_path, blarignore_path=blarignore_path)
    main_diff(
        file_diffs=[
            FileDiff(
                path="file:///home/juan/devel/blar/lsp-poc/blarify/graph/node/types/definition_node.py",
                diff_text="""@@ -1,7 +1,6 @@\n from typing import List, Optional, Tuple, Union, TYPE_CHECKING, Dict\n from blarify.graph.relationship import RelationshipCreator\n from blarify.graph.node.types.node import Node\n-from blarify.logger import Logger\n \n if TYPE_CHECKING:\n     from ..class_node import ClassNode\n@@ -131,10 +130,17 @@ def get_all_definition_ranges(self) -> List["Reference"]:\n         return definition_ranges\n \n     def add_extra_label_to_self_and_children(self, label: str) -> None:\n-        self.extra_labels.append(label)\n+        self.add_extra_label(label)\n         for node in self._defines:\n             node.add_extra_label_to_self_and_children(label)\n \n+    def add_extra_label(self, label: str) -> None:\n+        self.extra_labels.append(label)\n+\n+    def add_label_to_children_in_reference(self, label: str, reference: "Reference") -> None:\n+        node = self.reference_search(reference)\n+        node.add_extra_label_to_self_and_children(label)\n+\n     def add_extra_attribute_to_self_and_children(self, key: str, value: str) -> None:\n         self.add_extra_attribute(key, value)\n         for node in self._defines:""",
                change_type=ChangeType.ADDED,
            ),
        ],
        root_uri=root_path,
        blarignore_path=blarignore_path,
    )

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
