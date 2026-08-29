This should not get fixed

<octopus-studio-write path="src/bad-file.ts" description="This will produce 5 TypeScript errors.">
import NonExistentClass from 'non-existent-class';
import NonExistentClass2 from 'non-existent-class';
import NonExistentClass3 from 'non-existent-class';
import NonExistentClass4 from 'non-existent-class';
import NonExistentClass5 from 'non-existent-class';
</octopus-studio-write>

EOM
