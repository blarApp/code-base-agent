from llama_index.core.schema import BaseNode
import tree_sitter_languages
import os
import uuid


def traverse_tree(tree):
    cursor = tree.walk()
    visited_children = False
    while True:
        if not visited_children:
            yield cursor.node
            if not cursor.goto_first_child():
                visited_children = True
        elif cursor.goto_next_sibling():
            visited_children = False
        elif not cursor.goto_parent():
            break


def get_function_calls(code_text: str):
    parser = tree_sitter_languages.get_parser("python")
    tree = parser.parse(bytes(code_text, "utf-8"))
    node_names = map(lambda node: node, traverse_tree(tree))
    for node in node_names:
        if node.type == "call":
            print(node.text)


def format_function_node(node: BaseNode, scope: dict) -> dict:
    function_calls = get_function_calls(node.text)
    name = scope["name"]
    signature = scope["signature"]

    processed_node = {
        "type": "FUNCTION",
        "attributes": {
            "name": name,
            "signature": signature,
            "text": node.text,
            "node_id": node.node_id,
            "function_calls": function_calls,
        },
    }

    return processed_node


def format_class_node(node: BaseNode, scope: dict) -> dict:
    name = scope["name"]
    signature = scope["signature"]

    processed_node = {
        "type": "CLASS",
        "attributes": {
            "name": name,
            "signature": signature,
            "text": node.text,
            "node_id": node.node_id,
        },
    }

    return processed_node


def format_file_node(node: BaseNode) -> dict:
    processed_node = {
        "type": "FILE_ROOT",
        "attributes": {
            "text": node.text,
            "node_id": node.node_id,
        },
    }

    return processed_node


def format_directory_node(path: str, package: bool) -> dict:
    processed_node = {
        "attributes": {
            "path": path + "/",
            "name": os.path.basename(path),
            "node_id": str(uuid.uuid4()),
        },
        "type": "PACKAGE" if package else "FOLDER",
    }

    return processed_node
