import os
from typing import Any, List

from dotenv import load_dotenv
from neo4j import Driver, GraphDatabase

from blar_graph.db_managers.base_manager import BaseDBManager

load_dotenv()


class Neo4jManager(BaseDBManager):
    entityId: str
    repoId: str
    driver: Driver

    def __init__(self, repoId: str = None, entityId: str = None, max_connections: int = 50, create_index=False):
        uri = os.getenv("NEO4J_URI")
        user = os.getenv("NEO4J_USERNAME")
        password = os.getenv("NEO4J_PASSWORD")

        self.driver = GraphDatabase.driver(uri, auth=(user, password), max_connection_pool_size=max_connections)
        if create_index:
            self.create_indexes_and_constraints()
        self.repoId = repoId if repoId is not None else "default_repo"
        self.entityId = entityId if entityId is not None else "default_user"

    def create_indexes_and_constraints(self):
        self.create_function_name_index()
        self.create_node_id_index()
        self.create_entityId_index()
        self.create_unique_constraint()

    def query(self, query: str, query_params: dict = {}, result_format: str = "data"):
        with self.driver.session() as session:
            result = session.run(query, query_params)
            if result_format == "graph":
                return result.graph()
            return result.data()

    def save_graph(self, nodes: List[Any], edges: List[Any]):
        self.create_nodes(nodes)
        self.create_edges(edges)

    def create_function_name_index(self):
        # Creates a fulltext index on the name and path properties of the nodes
        with self.driver.session() as session:
            node_query = """
            CREATE FULLTEXT INDEX functionNames IF NOT EXISTS FOR (n:CLASS|FUNCTION|FILE) ON EACH [n.name, n.path, n.node_id]
            """
            session.run(node_query)

    def create_node_id_index(self):
        with self.driver.session() as session:
            node_query = """
            CREATE INDEX node_id_NODE IF NOT EXISTS FOR (n:NODE) ON (n.node_id)
            """
            session.run(node_query)

    def create_entityId_index(self):
        with self.driver.session() as session:
            user_query = """
            CREATE INDEX entityId_INDEX IF NOT EXISTS FOR (n:NODE) ON (n.entityId)
            """
            session.run(user_query)

    def create_unique_constraint(self):
        with self.driver.session() as session:
            constraint_query = """
            CREATE CONSTRAINT user_node_unique IF NOT EXISTS FOR (n:NODE)
            REQUIRE (n.entityId, n.node_id) IS UNIQUE
            """
            session.run(constraint_query)

    def close(self):
        # Close the connection to the database
        self.driver.close()

    def create_nodes(self, nodeList: List[Any]):
        # Function to create nodes in the Neo4j database
        with self.driver.session() as session:
            session.write_transaction(
                self._create_nodes_txn, nodeList, 10000, repoId=self.repoId, entityId=self.entityId
            )

    def create_edges(self, edgesList: List[Any]):
        # Function to create edges between nodes in the Neo4j database
        with self.driver.session() as session:
            session.write_transaction(self._create_edges_txn, edgesList, 10000, entityId=self.entityId)

    def format_query(self, query: str):
        # Function to format the query to be used in the fulltext index
        special_characters = [
            "+",
            "-",
            "&&",
            "||",
            "!",
            "(",
            ")",
            "{",
            "}",
            "[",
            "]",
            "^",
            '"',
            "~",
            "*",
            "?",
            ":",
            "\\",
            "/",
        ]
        for character in special_characters:
            query = query.replace(character, f"\\{character}")
        return query

    def get_node_by_id(self, node_id: str):
        query = """
        MATCH (n)
        WHERE n.node_id = $node_id
        return n
        """
        with self.driver.session() as session:
            result = session.run(query, {"node_id": node_id})
            node = result.data()[0]["n"]
            neighbours = self.get_1_hop_neighbours_and_relations(node["node_id"])
            node_result = {
                "node_id": node.get("node_id"),
                "node_name": node.get("name"),
                "file_path": node.get("file_path"),
                "start_line": node.get("start_line"),
                "end_line": node.get("end_line"),
                "text": node.get("text"),
            }
            return node_result, neighbours

    def get_whole_graph(self, result_format: str = "data"):
        query = "match (n {repoId: $repoId})-[r]-(m) return n, m, r"
        with self.driver.session() as session:
            result = session.run(query, repoId=self.repoId)
            if result_format == "graph":
                return result.graph()
            return result.data()

    def get_all_user_nodes(self, result_format: str = "data"):
        query = "match (n {entityId: $entityId})-[r]-(m) return n, m, r"
        with self.driver.session() as session:
            result = session.run(query, entityId=self.entityId)
            if result_format == "graph":
                return result.graph()
            return result.data()

    def search_code(self, query: str):
        # Function to get code from the Neo4j database based on a keyword query
        formatted_query = self.format_query(query)
        node_query = """
    CALL db.index.fulltext.queryNodes("functionNames", $formatted_query) YIELD node, score
    where node.repoId = $repoId
    RETURN node.node_id, node.name, node.file_path, score
        """
        with self.driver.session() as session:
            result = session.run(node_query, formatted_query=f"*{formatted_query}", repoId=self.repoId)
            data_result = result.data()
            if data_result is None:
                result = session.run(node_query, formatted_query=formatted_query, repoId=self.repoId)
                data_result = result.data()
            data_result = [
                {
                    "node_id": record["node.node_id"],
                    "node_name": record["node.name"],
                    "file_path": record["node.file_path"],
                    "score": record["score"],
                }
                for record in data_result
            ]
            return data_result

    def get_code(self, query: str):
        # Function to get code from the Neo4j database based on a keyword query
        formatted_query = self.format_query(query)
        node_query = """
    CALL db.index.fulltext.queryNodes("functionNames", $formatted_query) YIELD node, score
    where node.repoId = $repoId
    RETURN node.text, node.node_id, node.name, node.file_path, node.start_line, node.end_line, score
        """
        with self.driver.session() as session:
            result = session.run(node_query, formatted_query=f"*{formatted_query}", repoId=self.repoId)
            first_result = result.peek()
            if first_result is None:
                result = session.run(node_query, formatted_query=formatted_query, repoId=self.repoId)
                first_result = result.peek()
            if first_result is None:
                return None, None
            neighbours = self.get_1_hop_neighbours_and_relations(first_result["node.node_id"])
            return first_result, neighbours

    def get_1_hop_neighbours_and_relations(self, node_id: str):
        with self.driver.session() as session:
            result = session.run(
                """
                MATCH (p {node_id: $node_id})-[r]->(p2)
                RETURN
                    type(r) as relationship_type,
                    p2.node_id AS node_id,
                    p2.name AS node_name,
                    labels(p2) AS node_type
                """,
                node_id=node_id,
            )
            data = result.data()
            nodes_info = [
                {
                    "node_id": record["node_id"],
                    "node_name": record["node_name"],
                    "node_type": record["node_type"],
                    "relationship_type": record["relationship_type"],
                }
                for record in data
            ]
            return nodes_info

    def get_n_hop_neighbours(self, node_id: str, num_hops: int):
        # Function to get code from the Neo4j database based on a keyword query
        with self.driver.session() as session:
            result = session.run(
                """
                MATCH (p {node_id: $node_id})
                CALL apoc.neighbors.byhop(p, ">", $num_hops)
                YIELD nodes
                UNWIND nodes AS all_nodes
                RETURN all_nodes.node_id AS node_id, all_nodes.name AS function_name, labels(all_nodes) AS labels
                """,
                node_id=node_id,
                num_hops=num_hops,
            )
            data = result.data()
            # Construct list of objects containing node_id and function_name
            nodes_info = [
                {
                    "node_id": record["node_id"],
                    "function_name": record["function_name"],
                    "labels": record["labels"],
                }
                for record in data
            ]
            return nodes_info

    def get_incoming_neighbours(
        self, node_id: str | None = None, path: str | None = None, relationship_types: list | None = None
    ):
        with self.driver.session() as session:
            if path:
                query = f"""
                MATCH p1 {{ path:{path} }}<-[r]-(p2)
                """
            elif node_id:
                query = """
                MATCH (p {node_id: $node_id})<-[r]-(p2)
                """

            if relationship_types:
                if len(relationship_types) == 1:
                    query += f"WHERE type(r) = '{relationship_types[0]}'"
                else:
                    relationship_types_str = ", ".join([f"'{r}'" for r in relationship_types])
                    query += f"WHERE type(r) IN [{relationship_types_str}]"

            query += """
            RETURN
                type(r) as relationship_type,
                p2.node_id AS node_id,
                p2.name AS node_name,
                labels(p2) AS node_type
            """

            result = session.run(query, node_id=node_id)
            data = result.data()
            nodes_info = [
                {
                    "node_id": record["node_id"],
                    "node_name": record["node_name"],
                    "node_type": record["node_type"],
                    "relationship_type": record["relationship_type"],
                }
                for record in data
            ]
            return nodes_info

    @staticmethod
    def _create_nodes_txn(tx, nodeList: List[Any], batch_size: int, repoId: str, entityId: str):
        node_creation_query = """
        CALL apoc.periodic.iterate(
            "UNWIND $nodeList AS node RETURN node",
            "CALL apoc.create.node([node.type, 'NODE'], apoc.map.merge(node.attributes, {repoId: $repoId, entityId: $entityId})) YIELD node as n RETURN count(n) as count",
            {batchSize: $batchSize, parallel: true, iterateList: true, params: {nodeList: $nodeList, repoId: $repoId, entityId: $entityId}}
        )
        YIELD batches, total, errorMessages, updateStatistics
        RETURN batches, total, errorMessages, updateStatistics
        """

        result = tx.run(node_creation_query, nodeList=nodeList, batchSize=batch_size, repoId=repoId, entityId=entityId)

        # Fetch the result
        for record in result:
            print(f"Created {record['total']} nodes")

    @staticmethod
    def _create_edges_txn(tx, edgesList: List[Any], batch_size: int, entityId: str):
        # Cypher query using apoc.periodic.iterate for creating edges
        edge_creation_query = """
        CALL apoc.periodic.iterate(
            'WITH $edgesList AS edges UNWIND edges AS edgeObject RETURN edgeObject',
            'MATCH (node1:NODE {node_id: edgeObject.sourceId, entityId: $entityId}) MATCH (node2:NODE {node_id: edgeObject.targetId, entityId: $entityId}) CALL apoc.create.relationship(node1, edgeObject.type, {}, node2) YIELD rel RETURN rel',
            {batchSize:$batchSize, parallel:true, iterateList: true, params:{edgesList: $edgesList, entityId: $entityId}}
        )
        YIELD batches, total, errorMessages, updateStatistics
        RETURN batches, total, errorMessages, updateStatistics
        """
        # Execute the query
        result = tx.run(edge_creation_query, edgesList=edgesList, batchSize=batch_size, entityId=entityId)

        # Fetch the result
        for record in result:
            print(f"Created {record['total']} edges")
