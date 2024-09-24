import os

from llama_index.core.schema import BaseNode


def format_plain_code_block_node(node: BaseNode, scope: dict, function_calls: list[str], file_node_id: str) -> dict:
    name = scope["name"]
    signature = scope["signature"]

    processed_node = {
        "type": "CODE_BLOCK",
        "attributes": {
            "name": name,
            "signature": signature,
            "text": node.text,
            "function_calls": function_calls,
            "file_node_id": file_node_id,
        },
    }

    return processed_node


def format_function_node(node: BaseNode, scope: dict, function_calls: list[str], file_node_id: str) -> dict:
    name = scope["name"]
    signature = scope["signature"]

    processed_node = {
        "type": "FUNCTION",
        "attributes": {
            "name": name,
            "signature": signature,
            "text": node.text,
            "function_calls": function_calls,
            "file_node_id": file_node_id,
        },
    }

    return processed_node


def format_class_node(
    node: BaseNode, scope: dict, file_node_id: str, inheritances: list[str], function_calls: list[str]
) -> dict:
    name = scope["name"]
    signature = scope["signature"]

    processed_node = {
        "type": "CLASS",
        "attributes": {
            "name": name,
            "signature": signature,
            "text": node.text,
            "file_node_id": file_node_id,
            "inheritances": inheritances,
            "function_calls": function_calls,
        },
    }

    return processed_node


def format_file_node(node: BaseNode, no_extension_path: str, function_calls: list[str]) -> dict:
    processed_node = {
        "type": "FILE",
        "attributes": {
            "text": node.text,
            "function_calls": function_calls,
            "name": os.path.basename(no_extension_path),
        },
    }

    return processed_node


def format_directory_node(path: str, package: bool, level: int) -> dict:
    processed_node = {
        "attributes": {
            "path": path + "/",
            "name": os.path.basename(path),
            "level": level,
        },
        "type": "PACKAGE" if package else "FOLDER",
    }

    return processed_node
