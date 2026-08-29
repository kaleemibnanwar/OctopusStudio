I will intentionally add an error

<octopus-studio-write path="src/pages/Index.tsx" description="intentionally add an error">
// Update this page (the content is just a fallback if you fail to update the page)

import { MadeWithOctopusStudio } from "@/components/made-with-octopus-studio";

const Index = () => {
throw new Error("Line 6 error");
return (

<div className="min-h-screen flex items-center justify-center bg-gray-100">
<div className="text-center">
<h1 className="text-4xl font-bold mb-4">Welcome to Your Blank App</h1>
<p className="text-xl text-gray-600">
Start building your amazing project here!
</p>
</div>
<MadeWithOctopusStudio />
</div>
);
};

export default Index;
</octopus-studio-write>
