import re

import tree_sitter_languages
from tree_sitter import Node


def remove_non_ascii(text):
    # Define the regular expression pattern to match ascii characters
    pattern = re.compile(r"[^\x00-\x7F]+")
    # Replace ascii characters with an empty string
    cleaned_text = pattern.sub("", text)
    return cleaned_text


def format_methods(text: str, language: str) -> str:
    parser = tree_sitter_languages.get_parser(language)
    sitter_language = tree_sitter_languages.get_language(language)
    source_code = bytes(text, "utf-8")
    tree = parser.parse(source_code)

    methods_structures_query = sitter_language.query(
        """
        (method_definition
            (accessibility_modifier) @access
            return_type: _ @type_return
            )"""
    )

    # Execute the query
    captures = methods_structures_query.captures(tree.root_node)

    # Collect spans to remove
    spans_to_remove = []
    for capture in captures:
        node = capture[0]
        start_byte = node.start_byte
        end_byte = node.end_byte
        spans_to_remove.append((start_byte, end_byte))

    # Sort spans by start_byte in descending order
    spans_to_remove.sort(reverse=True, key=lambda span: span[0])

    # Remove spans from the text
    for start, end in spans_to_remove:
        text = text[:start] + text[end:]

    return text


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


def get_function_name(call_str):
    match = re.match(r"([a-zA-Z_][\w\.]*)\s*\(", call_str)
    if match:
        return match.group(1)  # Return the captured function name
    else:
        return None  # No function name found


def get_inheritances(node: Node, language: str) -> list[str]:
    code_text = node.text

    parser = tree_sitter_languages.get_parser(language)
    tree = parser.parse(bytes(code_text, "utf-8"))
    node_names = map(lambda node: node, traverse_tree(tree))

    inheritances = []

    for tree_node in node_names:
        if tree_node.type == "class_definition":
            statement_children = tree_node.children
            for child in statement_children:
                if child.type == "argument_list":
                    for argument in child.named_children:
                        if argument.type == "identifier":
                            inheritances.append(argument.text.decode("utf-8"))

    return inheritances
