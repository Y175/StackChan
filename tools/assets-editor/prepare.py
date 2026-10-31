#!/usr/bin/env python3
"""Prepare the pinned XiaoZhi web editor with the matching StackChan assets."""
import argparse
import shutil
import subprocess
from pathlib import Path

EDITOR_COMMIT = "55517b40d724014faff00f941ca700cbf9d14b51"
ROOT = Path(__file__).resolve().parent
REPOSITORY = ROOT.parents[1]


def prepare(assets_path):
    """Fetch the pinned editor, apply its adapter, and install a verified firmware baseline."""
    upstream = ROOT / "upstream"
    if not upstream.exists():
        subprocess.run(["git", "clone", "--filter=blob:none",
                        "https://github.com/78/xiaozhi-assets-generator.git", str(upstream)], check=True)
        subprocess.run(["git", "-C", str(upstream), "checkout", "--detach", EDITOR_COMMIT], check=True)
    actual = subprocess.check_output(["git", "-C", str(upstream), "rev-parse", "HEAD"], text=True).strip()
    if actual != EDITOR_COMMIT:
        raise RuntimeError(f"Editor checkout is {actual}; expected {EDITOR_COMMIT}. Preserve local edits before switching.")
    patch = str(ROOT / "upstream.patch")
    check = subprocess.run(["git", "-C", str(upstream), "apply", "--check", patch], capture_output=True)
    if check.returncode == 0:
        subprocess.run(["git", "-C", str(upstream), "apply", patch], check=True)
    else:
        subprocess.run(["git", "-C", str(upstream), "apply", "--reverse", "--check", patch], check=True)
    web = upstream / "web"
    shutil.copyfile(ROOT / "StackChanAssets.js", web / "src/utils/StackChanAssets.js")
    shutil.copyfile(ROOT / "package-lock.json", web / "package-lock.json")
    if not assets_path.is_file():
        raise FileNotFoundError(f"Build the firmware first: missing {assets_path}")
    subprocess.run(["node", str(ROOT / "validate-baseline.mjs"), str(assets_path)], check=True)
    shutil.copyfile(assets_path, web / "public/stackchan-base.bin")
    subprocess.run(["npm", "ci", "--no-audit", "--no-fund"], cwd=web, check=True)
    print(f"Ready: cd {web} && VITE_BASE_URL=/ npm run dev -- --host 127.0.0.1")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--assets", type=Path,
                        default=REPOSITORY / "firmware/build/generated_assets.bin")
    prepare(parser.parse_args().assets.resolve())
