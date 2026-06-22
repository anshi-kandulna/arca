import sys
import os
import json
from collections import defaultdict

# Add backend directory to path so we can import modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "backend")))

from routing_agent.routing_agent import RoutingAgent

def run_routing_phase(input_json_path, output_json_path, ollama_model="llama3.2:latest"):
    print(f"\n--- Starting Downstream Routing Agent Phase ---")
    print(f"Reading extracted MAPs from: {input_json_path}")
    
    if not os.path.exists(input_json_path):
        print(f"Error: Extracted JSON file '{input_json_path}' not found! Please run the full extraction first.")
        return False

    with open(input_json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    maps = data.get("maps", [])
    print(f"Found {len(maps)} obligations to route. Initializing RoutingAgent with model: {ollama_model}...")
    
    agent = RoutingAgent(ollama_model=ollama_model)
    
    routed_maps = []
    dept_summary = defaultdict(int)
    sv_summary = defaultdict(int)

    for i, m in enumerate(maps):
        print(f"[{i+1}/{len(maps)}] Routing: '{m['action'][:60]}...'")

        # Run routing agent (Keyword matcher + scope-enriched LLM fallback)
        res = agent.route_map(m)

        # Write routing result fields into the MAP
        m["department"] = res["assigned_department"]
        m["sub_vertical"] = res.get("sub_vertical")
        m["sub_vertical_scope"] = res.get("sub_vertical_scope")
        m["routing_confidence"] = res["confidence"]
        m["routing_reasoning"] = res["reasoning"]
        m["routing_source"] = res["routing_source"]
        m["routing_flagged"] = res.get("routing_flagged", False)

        dept_summary[res["assigned_department"]] += 1
        if res.get("sub_vertical"):
            sv_summary[res["sub_vertical"]] += 1
        routed_maps.append(m)

    # Update metadata
    data["maps"] = routed_maps
    data["department_summary"] = dict(dept_summary)
    data["sub_vertical_summary"] = dict(sv_summary)

    print("\nRouting Summary:")
    for dept, count in dept_summary.items():
        print(f"  - {dept}: {count}")
    print("\nSub-Vertical Summary:")
    for sv, count in sorted(sv_summary.items(), key=lambda x: -x[1]):
        print(f"  - {sv}: {count}")

    with open(output_json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\nSuccessfully saved fully routed output to: {output_json_path}")
    return True


def run_full_pipeline(pdf_path, output_json_path, ollama_model="llama3.2:latest"):
    print(f"--- Starting Full ARCA Pipeline ---")
    
    # 1. Run Map Extraction Agent
    # We run it programmatically by importing extract modules or as a subprocess
    # Run as a subprocess is cleaner and prevents conflicting global variables/sys.path issues
    import subprocess
    
    print("\nStep 1: Running MAP Extraction Agent (Docling PDF Extraction + Ollama)...")
    print("Note: This can take a few minutes as it processes the entire PDF.")
    
    # Change Cwd to map_agent so extract.py reads circular.pdf correctly
    extract_script = os.path.abspath(os.path.join(os.path.dirname(__file__), "map_agent", "extract.py"))
    extract_cwd = os.path.abspath(os.path.join(os.path.dirname(__file__), "map_agent"))
    
    # Copy PDF if it's different
    if pdf_path != os.path.join(extract_cwd, "circular.pdf"):
        import shutil
        shutil.copy(pdf_path, os.path.join(extract_cwd, "circular.pdf"))
        
    process = subprocess.run(
        [sys.executable, extract_script],
        cwd=extract_cwd,
        capture_output=False,
        text=True
    )
    
    if process.returncode != 0:
        print("\nError: Extraction agent failed!")
        return
        
    intermediate_json = os.path.join(extract_cwd, "arca_output.json")
    
    # 2. Run Downstream Routing Agent
    run_routing_phase(intermediate_json, output_json_path, ollama_model=ollama_model)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="ARCA Pipeline Runner")
    parser.add_argument("--mode", choices=["full", "route_only"], default="route_only",
                        help="Pipeline run mode: 'full' runs extraction + routing, 'route_only' runs routing on existing JSON")
    parser.add_argument("--pdf", default="backend/arca/circular.pdf", help="Path to circular PDF (for full mode)")
    parser.add_argument("--input_json", default="backend/arca/arca_output.json", help="Path to input extracted json (for route_only mode)")
    parser.add_argument("--output_json", default="backend/arca/arca_output_routed.json", help="Path to save fully routed output json")
    parser.add_argument("--model", default="llama3.2:latest", help="Ollama model to use for routing")
    
    args = parser.parse_args()
    
    if args.mode == "full":
        run_full_pipeline(args.pdf, args.output_json, ollama_model=args.model)
    else:
        run_routing_phase(args.input_json, args.output_json, ollama_model=args.model)
