Tests delete-rename-write order
<octopus-studio-delete path="src/main.tsx">
</octopus-studio-delete>
<octopus-studio-rename from="src/App.tsx" to="src/main.tsx">
</octopus-studio-rename>
<octopus-studio-write path="src/main.tsx" description="final main.tsx file.">
finalMainTsxFileWithError();
</octopus-studio-write>
EOM
