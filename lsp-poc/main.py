from project_graph_creator import ProjectGraphCreator
from project_file_explorer import ProjectFilesIterator
from db_managers.neo4j_manager import Neo4jManager
from code_references import LspQueryHelper, LspCaller
from code_hierarchy import TreeSitterHelper
from code_hierarchy.languages import PythonDefinitions, JavascripLanguageDefinitions, TypescriptDefinitions

import dotenv
import os


def main(root_path: str = None, blarignore_path: str = None, project_language: str = None):
    if project_language == "python":
        language_definitions = PythonDefinitions
    elif project_language == "javascript":
        language_definitions = JavascripLanguageDefinitions
    elif project_language == "typescript":
        language_definitions = TypescriptDefinitions
    else:
        raise Exception(f"Unsupported language: {project_language}")

    lsp_caller = LspCaller(root_uri=root_path, log=True)
    lsp_query_helper = LspQueryHelper(lsp_caller)
    tree_sitter_helper = TreeSitterHelper(language_definitions=language_definitions)

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
    dotenv.load_dotenv()
    root_path = os.getenv("ROOT_PATH")
    blarignore_path = os.getenv("BLARIGNORE_PATH")
    project_language = os.getenv("PROJECT_LANGUAGE")
    main(root_path=root_path, blarignore_path=blarignore_path, project_language=project_language)
