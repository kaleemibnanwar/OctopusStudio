import { getGithubUser } from "../handlers/github_handlers";

export async function getGitAuthor() {
  const user = await getGithubUser();
  const author = user
    ? {
        name: "Octopus Studio",
        email: user.email,
      }
    : {
        name: "Octopus Studio",
        email: "git@octopusStudio.sh",
      };
  return author;
}
