from Graph.ProjectGraphCreator import ProjectGraphCreator
from Files import ProjectFilesIterator
from DbManagers.Neo4jManager import Neo4jManager
from LSP import LspQueryHelper, LspCaller
from TreeSitter import TreeSitterHelper
from TreeSitter.Languages import PythonDefinitions

import dotenv
import os


def main():
    dotenv.load_dotenv()
    root_path = os.getenv("ROOT_PATH")
    blarignore_path = os.getenv("BLARIGNORE_PATH")

    lsp_caller = LspCaller(root_uri=root_path)
    lsp_query_helper = LspQueryHelper(lsp_caller)
    tree_sitter_helper = TreeSitterHelper(language_definitions=PythonDefinitions)

    lsp_query_helper.start()

    project_files_iterator = ProjectFilesIterator(
        root_path=root_path,
        blarignore_path=blarignore_path,
    )

    repoId = "test"
    entity_id = "test"
    graph_manager = Neo4jManager(repoId, entity_id)

    graph_creator = ProjectGraphCreator("Test", lsp_query_helper, tree_sitter_helper, project_files_iterator)

    graph = graph_creator.build()

    relationships = graph.get_relationships_as_objects()
    nodes = graph.get_nodes_as_objects()
    graph_manager.save_graph(nodes, relationships)

    lsp_query_helper.shutdown_exit_close()


if __name__ == "__main__":
    main()
