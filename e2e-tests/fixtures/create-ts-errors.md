This will get a TypeScript error.

<octopus-studio-write path="src/bad-file.ts" description="This will get a TypeScript error.">
import NonExistentClass from 'non-existent-class';

const x = new Object();
x.nonExistentMethod();
</octopus-studio-write>

EOM
