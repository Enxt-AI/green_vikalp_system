"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface IntegrationPageProps {
  title: string;
  description: string;
}

export function IntegrationPage({ title, description }: IntegrationPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">{title}</h1>
        <p className="mt-1 text-sm text-neutral-500">{description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connection Status</CardTitle>
          <CardDescription>Manage your connection to {title}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
            <svg
              className="h-6 w-6 text-neutral-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.19 8.688a4.5 4.5 0 011.242 7.244L12 21l-1.433-6.432a4.5 4.5 0 011.242-7.244zM12 15.95//a3 3 0 110-6 3 3 0 010 6z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-neutral-900">Not Connected</p>
          <p className="mt-1 text-xs text-neutral-500">
            You have not connected your {title} account yet.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button className="bg-neutral-900 hover:bg-neutral-800">
            Connect {title}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
