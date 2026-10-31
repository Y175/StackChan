import os
import subprocess
import json


def clone_or_update_repo(
    repo_url, path, ref=None, with_submodules=False, patch_path=None, expected_commit=None
):
    """Prepare a dependency without discarding edits or hiding patch failures."""

    if not os.path.exists(path):
        subprocess.run(["git", "clone", "--filter=blob:none", repo_url, path], check=True)
    else:
        subprocess.run(["git", "-C", path, "fetch", "origin", ref or "HEAD"], check=True)

    if ref:
        subprocess.run(["git", "-C", path, "checkout", ref], check=True)

    if expected_commit:
        actual_commit = subprocess.check_output(
            ["git", "-C", path, "rev-parse", "HEAD"], text=True
        ).strip()
        if actual_commit != expected_commit:
            raise RuntimeError(f"Unexpected commit for {path}: {actual_commit}, expected {expected_commit}")

    if with_submodules:
        subprocess.run(
            ["git", "-C", path, "submodule", "update", "--init", "--recursive"],
            check=True,
        )

    # 应用 patch
    if patch_path:
        patch_full_path = (
            patch_path
            if os.path.isabs(patch_path)
            else os.path.join(os.getcwd(), patch_path)
        )
        # Repeated setup may encounter an already-applied patch. Any other
        # failure must stop the build instead of silently losing board fixes.
        check_result = subprocess.run(
            ["git", "-C", path, "apply", "--check", patch_full_path]
        )
        if check_result.returncode == 0:
            subprocess.run(["git", "-C", path, "apply", patch_full_path], check=True)
            print(f"Applied patch {patch_path} to {path}")
        else:
            reverse_check = subprocess.run(
                ["git", "-C", path, "apply", "--reverse", "--check", patch_full_path],
                capture_output=True,
            )
            if reverse_check.returncode != 0:
                raise RuntimeError(f"Patch {patch_path} does not match {path}; inspect local changes")
            print(f"Patch {patch_path} already applied to {path}")


def fetch_dependencies():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    config_path = os.path.join(script_dir, "repos.json")

    with open(config_path) as f:
        repos = json.load(f)

    for repo in repos:
        repo_path = os.path.join(script_dir, repo["path"])
        branch = repo.get("branch")
        with_submodules = repo.get("with_submodules", False)
        patch = repo.get("patch")
        if patch and not os.path.isabs(patch):
            patch = os.path.join(script_dir, patch)
        clone_or_update_repo(repo["url"], repo_path, branch, with_submodules, patch, repo.get("commit"))


if __name__ == "__main__":
    fetch_dependencies()
