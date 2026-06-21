"use client";

/**
 * Data Connectors — connect to external data sources
 * (PostgreSQL, MySQL, S3, BigQuery, Snowflake, Redis, etc.)
 * and insert a connection snippet into the notebook.
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFeatureStore } from "../feature-store";
import { useNotebookStore } from "@/lib/notebook-store";
import { Plug, Database, Cloud, Server, Code2, Check } from "lucide-react";

interface Connector {
  id: string;
  name: string;
  category: "sql" | "nosql" | "cloud" | "file";
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  pipPackage: string;
  importStmt: string;
  connectTemplate: string;
  fields: Array<{ name: string; placeholder: string; required: boolean; secret?: boolean }>;
}

const CONNECTORS: Connector[] = [
  {
    id: "postgres",
    name: "PostgreSQL",
    category: "sql",
    icon: Database,
    color: "text-sky-500",
    pipPackage: "psycopg2-binary",
    importStmt: "import psycopg2",
    connectTemplate:
      'conn = psycopg2.connect(host="{host}", port={port}, dbname="{database}", user="{user}", password="{password}")\ncur = conn.cursor()\ncur.execute("SELECT version()")\nprint(cur.fetchone())',
    fields: [
      { name: "host", placeholder: "localhost", required: true },
      { name: "port", placeholder: "5432", required: true },
      { name: "database", placeholder: "mydb", required: true },
      { name: "user", placeholder: "postgres", required: true },
      { name: "password", placeholder: "••••••••", required: true, secret: true },
    ],
  },
  {
    id: "mysql",
    name: "MySQL",
    category: "sql",
    icon: Database,
    color: "text-orange-500",
    pipPackage: "mysql-connector-python",
    importStmt: "import mysql.connector",
    connectTemplate:
      'conn = mysql.connector.connect(host="{host}", user="{user}", password="{password}", database="{database}")\ncur = conn.cursor()\ncur.execute("SELECT VERSION()")\nprint(cur.fetchone())',
    fields: [
      { name: "host", placeholder: "localhost", required: true },
      { name: "database", placeholder: "mydb", required: true },
      { name: "user", placeholder: "root", required: true },
      { name: "password", placeholder: "••••••••", required: true, secret: true },
    ],
  },
  {
    id: "sqlite",
    name: "SQLite",
    category: "sql",
    icon: Database,
    color: "text-emerald-500",
    pipPackage: "(builtin)",
    importStmt: "import sqlite3",
    connectTemplate:
      'conn = sqlite3.connect("{path}")\ncur = conn.cursor()\ncur.execute("SELECT name FROM sqlite_master WHERE type=\\"table\\"")\nprint(cur.fetchall())',
    fields: [{ name: "path", placeholder: "data.db", required: true }],
  },
  {
    id: "s3",
    name: "AWS S3",
    category: "cloud",
    icon: Cloud,
    color: "text-amber-500",
    pipPackage: "boto3",
    importStmt: "import boto3",
    connectTemplate:
      's3 = boto3.client("s3", aws_access_key_id="{access_key}", aws_secret_access_key="{secret_key}", region_name="{region}")\nresp = s3.list_buckets()\nfor b in resp["Buckets"]:\n    print(b["Name"])',
    fields: [
      { name: "access_key", placeholder: "AKIA…", required: true, secret: true },
      { name: "secret_key", placeholder: "••••••••", required: true, secret: true },
      { name: "region", placeholder: "us-east-1", required: true },
    ],
  },
  {
    id: "bigquery",
    name: "BigQuery",
    category: "cloud",
    icon: Cloud,
    color: "text-sky-500",
    pipPackage: "google-cloud-bigquery",
    importStmt: "from google.cloud import bigquery",
    connectTemplate:
      'client = bigquery.Client(project="{project}")\nq = client.query("SELECT COUNT(*) FROM `bigquery-public-data.samples.shakespeare`")\nprint(q.result().to_dataframe())',
    fields: [{ name: "project", placeholder: "my-gcp-project", required: true }],
  },
  {
    id: "snowflake",
    name: "Snowflake",
    category: "sql",
    icon: Server,
    color: "text-sky-500",
    pipPackage: "snowflake-connector-python",
    importStmt: "import snowflake.connector",
    connectTemplate:
      'conn = snowflake.connector.connect(user="{user}", password="{password}", account="{account}", warehouse="{warehouse}", database="{database}")\ncur = conn.cursor()\ncur.execute("SELECT CURRENT_VERSION()")\nprint(cur.fetchone())',
    fields: [
      { name: "user", placeholder: "username", required: true },
      { name: "password", placeholder: "••••••••", required: true, secret: true },
      { name: "account", placeholder: "xy12345", required: true },
      { name: "warehouse", placeholder: "COMPUTE_WH", required: true },
      { name: "database", placeholder: "MYDB", required: true },
    ],
  },
  {
    id: "redis",
    name: "Redis",
    category: "nosql",
    icon: Server,
    color: "text-rose-500",
    pipPackage: "redis",
    importStmt: "import redis",
    connectTemplate:
      'r = redis.Redis(host="{host}", port={port}, password="{password}", decode_responses=True)\nprint(r.ping())\nprint(r.dbsize())',
    fields: [
      { name: "host", placeholder: "localhost", required: true },
      { name: "port", placeholder: "6379", required: true },
      { name: "password", placeholder: "••••••••", required: false, secret: true },
    ],
  },
  {
    id: "mongo",
    name: "MongoDB",
    category: "nosql",
    icon: Server,
    color: "text-emerald-500",
    pipPackage: "pymongo",
    importStmt: "from pymongo import MongoClient",
    connectTemplate:
      'client = MongoClient("mongodb+srv://{user}:{password}@cluster.mongodb.net/")\ndb = client["{database}"]\nprint(db.list_collection_names())',
    fields: [
      { name: "user", placeholder: "username", required: true },
      { name: "password", placeholder: "••••••••", required: true, secret: true },
      { name: "database", placeholder: "mydb", required: true },
    ],
  },
];

const CATEGORY_LABEL: Record<Connector["category"], string> = {
  sql: "SQL",
  nosql: "NoSQL",
  cloud: "Cloud",
  file: "File",
};

export function DataConnectors() {
  const open = useFeatureStore((s) => s.openFeatureId === "data-connectors");
  const close = useFeatureStore((s) => s.closeFeature);
  const insertCells = useNotebookStore((s) => s.insertCells);
  const activeCellId = useNotebookStore((s) => s.activeCellId);
  const [selId, setSelId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [inserted, setInserted] = useState(false);

  const sel = CONNECTORS.find((c) => c.id === selId);

  const insert = () => {
    if (!sel) return;
    let tpl = sel.connectTemplate;
    for (const f of sel.fields) {
      tpl = tpl.replace(new RegExp(`\\{${f.name}\\}`, "g"), values[f.name] ?? "");
    }
    insertCells(
      [
        {
          kind: "markdown",
          source: `## Connect to ${sel.name}\n\n- **pip:** \`${sel.pipPackage}\`\n- **import:** \`${sel.importStmt}\`\n`,
        },
        {
          kind: "code",
          source: `!pip install -q ${sel.pipPackage}\n${sel.importStmt}`,
        },
        { kind: "code", source: tpl },
      ],
      activeCellId,
    );
    setInserted(true);
    setTimeout(() => {
      setInserted(false);
      close();
    }, 800);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Plug className="h-4 w-4 text-emerald-500" />
            Data Connectors
            <Badge variant="secondary" className="ml-1">{CONNECTORS.length}</Badge>
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Connect to databases &amp; cloud storage. Generates an install + connect snippet.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 overflow-auto">
          {/* Left: connector list */}
          <div className="space-y-1.5">
            {CONNECTORS.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setSelId(c.id);
                  setValues({});
                  setInserted(false);
                }}
                className={`flex w-full items-center gap-2 rounded-md border p-2 text-left transition-colors ${
                  selId === c.id
                    ? "border-foreground/40 bg-accent/50"
                    : "border-border/60 bg-card/40 hover:bg-accent/30"
                }`}
              >
                <c.icon className={`h-4 w-4 ${c.color}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12.5px] font-semibold">{c.name}</span>
                    <Badge variant="outline" className="text-[10px]">{CATEGORY_LABEL[c.category]}</Badge>
                  </div>
                  <code className="text-[10.5px] text-muted-foreground">{c.pipPackage}</code>
                </div>
              </button>
            ))}
          </div>

          {/* Right: form */}
          <div className="rounded-md border border-border/60 bg-card/40 p-3">
            {!sel && (
              <div className="py-12 text-center text-[12px] text-muted-foreground">
                Select a connector to configure.
              </div>
            )}
            {sel && (
              <>
                <div className="mb-2 flex items-center gap-2">
                  <sel.icon className={`h-4 w-4 ${sel.color}`} />
                  <h3 className="text-[13px] font-semibold">{sel.name}</h3>
                </div>
                <div className="space-y-1.5">
                  {sel.fields.map((f) => (
                    <div key={f.name}>
                      <label className="mb-0.5 block text-[10.5px] text-muted-foreground">
                        {f.name} {f.required && <span className="text-rose-500">*</span>}
                      </label>
                      <Input
                        value={values[f.name] ?? ""}
                        onChange={(e) =>
                          setValues((v) => ({ ...v, [f.name]: e.target.value }))
                        }
                        placeholder={f.placeholder}
                        type={f.secret ? "password" : "text"}
                        className="h-8 text-[12px] font-mono"
                      />
                    </div>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="default"
                  className="mt-3 h-8 gap-1.5 text-[11px]"
                  onClick={insert}
                  disabled={inserted}
                >
                  {inserted ? (
                    <>
                      <Check className="h-3 w-3" /> Inserted
                    </>
                  ) : (
                    <>
                      <Code2 className="h-3 w-3" /> Insert snippet
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
