"""Tests for the data validator. Run: python3 -m unittest discover -s tools -v"""
import unittest
from pathlib import Path
import tempfile

from validate import check_objects, check_timeline, check_routes, check_poems, check_crosslinks


class CheckObjects(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        (self.root / "assets" / "img").mkdir(parents=True)
        (self.root / "assets" / "img" / "jar.jpg").write_bytes(b"fake")

    def valid(self):
        return {
            "id": "jar",
            "room": "ceramics",
            "title": "A jar",
            "date": "8th century",
            "museum": {"name": "M", "accession": "1.2.3", "license": "CC0"},
            "image": {"src": "../assets/img/jar.jpg", "aspect": "3/4"},
            "summary": "Words.",
            "hotspots": [{"x": 0.5, "y": 0.5, "label": "L", "body": "B", "seeAlso": []}],
        }

    def test_valid_record_has_no_problems(self):
        self.assertEqual(check_objects([self.valid()], self.root), [])

    def test_missing_image_file_is_reported(self):
        record = self.valid()
        record["image"]["src"] = "../assets/img/absent.jpg"
        problems = check_objects([record], self.root)
        self.assertTrue(any("absent.jpg" in p for p in problems))

    def test_hotspot_coordinate_above_one_is_reported(self):
        record = self.valid()
        record["hotspots"][0]["x"] = 1.4
        problems = check_objects([record], self.root)
        self.assertTrue(any("0-1" in p for p in problems))

    def test_duplicate_ids_are_reported(self):
        problems = check_objects([self.valid(), self.valid()], self.root)
        self.assertTrue(any("duplicate" in p.lower() for p in problems))

    def test_unknown_room_is_reported(self):
        record = self.valid()
        record["room"] = "kitchen"
        problems = check_objects([record], self.root)
        self.assertTrue(any("room" in p for p in problems))

    def test_missing_license_is_reported(self):
        record = self.valid()
        del record["museum"]["license"]
        problems = check_objects([record], self.root)
        self.assertTrue(any("license" in p for p in problems))


class CheckTimeline(unittest.TestCase):
    def test_valid_timeline_has_no_problems(self):
        records = [{"year": 618, "era": "early", "title": "T", "body": "B", "objects": []}]
        self.assertEqual(check_timeline(records), [])

    def test_unknown_era_is_reported(self):
        records = [{"year": 618, "era": "middle", "title": "T", "body": "B", "objects": []}]
        self.assertTrue(any("era" in p for p in check_timeline(records)))

    def test_out_of_range_year_is_reported(self):
        records = [{"year": 1200, "era": "late", "title": "T", "body": "B", "objects": []}]
        self.assertTrue(any("618" in p or "907" in p for p in check_timeline(records)))

    def test_unsorted_years_are_reported(self):
        records = [
            {"year": 780, "era": "late", "title": "A", "body": "B", "objects": []},
            {"year": 618, "era": "early", "title": "C", "body": "D", "objects": []},
        ]
        self.assertTrue(any("order" in p.lower() for p in check_timeline(records)))


class CheckRoutes(unittest.TestCase):
    def valid(self):
        return {
            "nodes": [
                {"id": "changan", "name": "Chang'an", "x": 10, "y": 20,
                 "layers": ["goods"], "body": "B", "seeAlso": []},
                {"id": "dunhuang", "name": "Dunhuang", "x": 30, "y": 40,
                 "layers": ["religions"], "body": "B", "seeAlso": []},
            ],
            "edges": [{"from": "changan", "to": "dunhuang"}],
        }

    def test_valid_routes_have_no_problems(self):
        self.assertEqual(check_routes(self.valid()), [])

    def test_edge_to_unknown_node_is_reported(self):
        data = self.valid()
        data["edges"][0]["to"] = "atlantis"
        self.assertTrue(any("atlantis" in p for p in check_routes(data)))

    def test_unknown_layer_is_reported(self):
        data = self.valid()
        data["nodes"][0]["layers"] = ["spices"]
        self.assertTrue(any("layer" in p for p in check_routes(data)))


class CheckPoems(unittest.TestCase):
    def valid(self):
        return {
            "id": "p1",
            "author": "Li Bai",
            "title": "静夜思",
            "titleGloss": "Quiet Night Thoughts",
            "context": "C",
            "lines": [{"characters": [
                {"char": "床", "pinyin": "chuáng", "gloss": "bed", "tone": "level"}
            ]}],
            "translations": {"literal": "L", "literary": "Y"},
        }

    def test_valid_poem_has_no_problems(self):
        self.assertEqual(check_poems([self.valid()]), [])

    def test_numeric_tone_is_reported(self):
        record = self.valid()
        record["lines"][0]["characters"][0]["tone"] = "2"
        problems = check_poems([record])
        self.assertTrue(any("tone" in p for p in problems))

    def test_missing_literary_translation_is_reported(self):
        record = self.valid()
        del record["translations"]["literary"]
        self.assertTrue(any("literary" in p for p in check_poems([record])))

    def test_multi_character_char_field_is_reported(self):
        record = self.valid()
        record["lines"][0]["characters"][0]["char"] = "床前"
        self.assertTrue(any("single" in p.lower() for p in check_poems([record])))


class CheckCrosslinks(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        (self.root / "rooms").mkdir(parents=True)
        (self.root / "rooms" / "ceramics.html").write_text("<html></html>", encoding="utf-8")

    def test_resolvable_link_has_no_problems(self):
        objects = [{"id": "jar", "hotspots": [{"seeAlso": ["ceramics.html#jar"]}]}]
        problems = check_crosslinks(objects, {"nodes": []}, [], self.root)
        self.assertEqual(problems, [])

    def test_link_to_missing_page_is_reported(self):
        objects = [{"id": "jar", "hotspots": [{"seeAlso": ["absent.html#jar"]}]}]
        problems = check_crosslinks(objects, {"nodes": []}, [], self.root)
        self.assertTrue(any("absent.html" in p for p in problems))

    def test_link_to_missing_anchor_is_reported(self):
        objects = [{"id": "jar", "hotspots": [{"seeAlso": ["ceramics.html#ghost"]}]}]
        problems = check_crosslinks(objects, {"nodes": []}, [], self.root)
        self.assertTrue(any("ghost" in p for p in problems))

    def test_timeline_object_reference_must_exist(self):
        objects = [{"id": "jar", "hotspots": []}]
        timeline = [{"year": 618, "objects": ["nonexistent"]}]
        problems = check_crosslinks(objects, {"nodes": []}, timeline, self.root)
        self.assertTrue(any("nonexistent" in p for p in problems))

    def test_map_node_anchor_is_valid_on_changan_page(self):
        (self.root / "rooms" / "changan.html").write_text("<html></html>", encoding="utf-8")
        objects = [{"id": "jar", "hotspots": [{"seeAlso": ["changan.html#samarkand"]}]}]
        routes = {"nodes": [{"id": "samarkand"}]}
        self.assertEqual(check_crosslinks(objects, routes, [], self.root), [])

    def test_unknown_map_node_anchor_is_reported(self):
        (self.root / "rooms" / "changan.html").write_text("<html></html>", encoding="utf-8")
        objects = [{"id": "jar", "hotspots": [{"seeAlso": ["changan.html#atlantis"]}]}]
        routes = {"nodes": [{"id": "samarkand"}]}
        problems = check_crosslinks(objects, routes, [], self.root)
        self.assertTrue(any("map node id" in p for p in problems))

    def test_object_id_is_not_accepted_as_a_map_anchor(self):
        (self.root / "rooms" / "changan.html").write_text("<html></html>", encoding="utf-8")
        objects = [{"id": "jar", "hotspots": [{"seeAlso": ["changan.html#jar"]}]}]
        routes = {"nodes": [{"id": "samarkand"}]}
        problems = check_crosslinks(objects, routes, [], self.root)
        self.assertTrue(any("map node id" in p for p in problems))


if __name__ == "__main__":
    unittest.main()
