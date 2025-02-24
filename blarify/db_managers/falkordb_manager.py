import os
import time
from typing import Any, List
import logging

from dotenv import load_dotenv
from falkordb import FalkorDB, exceptions

logger = logging.getLogger(__name__)

load_dotenv()


class FalkorDBManager:
    entity_id: str
    repo_id: str
    db: FalkorDB

    def __init__(
        self,
        repo_id: str = None,
        entity_id: str = None,
        uri: str = None,
        user: str = None,
        password: str = None,
    ):
        host = uri or os.getenv("FALKORDB_URI", "localhost")
        port = int(os.getenv("FALKORDB_PORT", 6379))
        user = user or os.getenv("FALKORDB_USERNAME")
        password = password or os.getenv("FALKORDB_PASSWORD")

        self.db = FalkorDB(host=host, port=port, username=user, password=password)

        self.repo_id = repo_id if repo_id is not None else "default_repo"
        self.entity_id = entity_id if entity_id is not None else "default_user"

    def close(self):
        pass

    def save_graph(self, nodes: List[Any], edges: List[Any]):
        self.create_nodes(nodes)
        self.create_edges(edges)

    def create_nodes(self, nodeList: List[Any]):
        graph = self.db.select_graph(self.repo_id)
        for node in nodeList:
            labels = ":".join(node.get("extra_labels", []) + [node["type"], "NODE"])
            attributes = node.get("attributes", {})
            attributes.update({"repoId": self.repo_id, "entityId": self.entity_id})
            cypher_query = f"CREATE (n:{labels} ) SET n = $props"
            graph.query(cypher_query, params={"props": attributes})

    def create_edges(self, edgesList: List[Any]):
        graph = self.db.select_graph(self.repo_id)
        for edge in edgesList:
            relationship_type = edge["type"]

            cypher_query = (
                f"MATCH (a:NODE {{node_id: $sourceId}}), (b:NODE {{node_id: $targetId}}) "
                f"CREATE (a)-[:{relationship_type} {{scopeText: $scopeText}}]->(b)"
            )

            graph.query(
                cypher_query,
                params={
                    "sourceId": edge["sourceId"],
                    "targetId": edge["targetId"],
                    "scopeText": edge["scopeText"],
                },
            )

    def detach_delete_nodes_with_path(self, path: str):
        graph = self.db.select_graph(self.repo_id)
        cypher_query = "MATCH (n {path: $path}) DETACH DELETE n"
        result = graph.query(cypher_query, params={"path": path})
        return result.result_set
