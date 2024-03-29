import os
from pathlib import Path
import tree_sitter_languages
from blar_graph.utils import format_nodes, tree_parser
from llama_index.core import SimpleDirectoryReader
from llama_index.core.schema import NodeRelationship, BaseNode
from llama_index.core.text_splitter import CodeSplitter
from llama_index.packs.code_hierarchy import CodeHierarchyNodeParser


class GraphFileParser:
    RELATIONS_TYPES_MAP = {
        "function_definition": "FUNCTION_DEFINITION",
        "class_definition": "CLASS_DEFINITION",
    }

    def __init__(
        self,
        file_path: str,
        root_path: str,
        language: str,
        directory_path: str,
        visited_nodes: dict,
        global_imports: dict,
    ):
        self.file_path = file_path
        self.language = language
        self.directory_path = directory_path
        self.visited_nodes = visited_nodes
        self.global_imports = global_imports
        self.root_path = root_path

    def parse(self):
        path = Path(self.file_path)
        if not path.exists():
            print(f"File {self.file_path} does not exist.")
            return
        documents = SimpleDirectoryReader(
            input_files=[path],
            file_metadata=lambda x: {"filepath": x},
        ).load_data()

        code = CodeHierarchyNodeParser(
            language=self.language,
            chunk_min_characters=3,
            code_splitter=CodeSplitter(
                language=self.language, max_chars=10000, chunk_lines=10
            ),
        )
        no_extension_path = self.file_path.replace(".py", "")

        split_nodes = code.get_nodes_from_documents(documents)
        node_list = []
        edges_list = []

        file_node, file_relations = self.__process_node__(
            split_nodes.pop(0), no_extension_path, ""
        )
        file_node["directory"] = self.directory_path
        file_node["name"] = os.path.basename(self.file_path)
        node_list.append(file_node)
        edges_list.extend(file_relations)

        for node in split_nodes:
            processed_node, relationships = self.__process_node__(
                node, no_extension_path, file_node["attributes"]["node_id"]
            )
            node_list.append(processed_node)
            edges_list.extend(relationships)

        imports = self._get_imports(str(path), node_list[0]["attributes"]["node_id"])

        return node_list, edges_list, imports

    def __process_node__(
        self, node: BaseNode, no_extension_path: str, file_node_id: str
    ):
        relationships = []
        asignments_dict = {}
        scope = (
            node.metadata["inclusive_scopes"][-1]
            if node.metadata["inclusive_scopes"]
            else None
        )
        type_node = "file"
        if scope:
            type_node = scope["type"]

        if type_node == "function_definition":
            function_calls = tree_parser.get_function_calls(node, asignments_dict)
            processed_node = format_nodes.format_function_node(
                node, scope, function_calls, file_node_id
            )
        elif type_node == "class_definition":
            processed_node = format_nodes.format_class_node(node, scope, file_node_id)
        else:
            function_calls = tree_parser.get_function_calls(node, asignments_dict)
            processed_node = format_nodes.format_file_node(
                node, no_extension_path, function_calls
            )

        for relation in node.relationships.items():
            if relation[0] == NodeRelationship.CHILD:
                for child in relation[1]:
                    relation_type = (
                        child.metadata["inclusive_scopes"][-1]["type"]
                        if child.metadata["inclusive_scopes"]
                        else ""
                    )
                    relationships.append(
                        {
                            "sourceId": node.node_id,
                            "targetId": child.node_id,
                            "type": self.RELATIONS_TYPES_MAP.get(
                                relation_type, "UNKNOWN"
                            ),
                        }
                    )
            elif relation[0] == NodeRelationship.PARENT:
                if relation[1]:
                    parent_path = self.visited_nodes.get(
                        relation[1].node_id, no_extension_path
                    ).replace("/", ".")
                    node_path = f"{parent_path}.{processed_node['attributes']['name']}"
                else:
                    node_path = no_extension_path.replace("/", ".")
        processed_node["attributes"]["path"] = node_path
        self.global_imports[node_path] = {
            "id": processed_node["attributes"]["node_id"],
            "type": processed_node["type"],
        }
        self.visited_nodes[node.node_id] = node_path
        return processed_node, relationships

    def _get_imports(self, path: str, file_node_id: str) -> dict:
        parser = tree_sitter_languages.get_parser("python")
        with open(path, "r") as file:
            code = file.read()
        tree = parser.parse(bytes(code, "utf-8"))

        imports = {}
        for node in tree.root_node.children:
            if node.type == "import_from_statement":
                import_statements = node.named_children

                from_statement = import_statements[0]
                from_text = from_statement.text.decode()
                for import_statement in import_statements[1:]:
                    imports[import_statement.text.decode()] = (
                        tree_parser.resolve_import_path(from_text, path, self.root_path)
                    )

            elif node.type == "import_statement":
                import_statement = node.named_children[0]
                imports["global"] = import_statement.text.decode()

        return {file_node_id: imports}
