from project_graph_creator import ProjectGraphCreator
from project_file_explorer import ProjectFilesIterator
from db_managers.neo4j_manager import Neo4jManager
from code_references import LspQueryHelper

import dotenv
import os


def main(root_uri: str = None, blarignore_path: str = None):
    lsp_query_helper = LspQueryHelper(root_uri=root_uri)

    lsp_query_helper.start()

    project_files_iterator = ProjectFilesIterator(
        root_path=root_uri,
        blarignore_path=blarignore_path,
    )

    repoId = "test-ruby"
    entity_id = "test"
    graph_manager = Neo4jManager(repoId, entity_id)

    graph_creator = ProjectGraphCreator("Test", lsp_query_helper, project_files_iterator)

    graph = graph_creator.build()

    relationships = graph.get_relationships_as_objects()
    nodes = graph.get_nodes_as_objects()

    print(f"Saving graph with {len(nodes)} nodes and {len(relationships)} relationships")
    graph_manager.save_graph(nodes, relationships)
    graph_manager.close()

    lsp_query_helper.shutdown_exit_close()


if __name__ == "__main__":
    dotenv.load_dotenv()
    root_path = "/Users/berrazuriz/Desktop/Blar/repositories/ruby-on-rails-sample-app/"
    blarignore_path = os.getenv("BLARIGNORE_PATH")
    main(root_uri=root_path, blarignore_path=blarignore_path)
