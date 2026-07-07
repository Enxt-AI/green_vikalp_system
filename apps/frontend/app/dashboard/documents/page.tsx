"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { folders, documents, users, type Folder, type ManagedDocument, type User } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Folder as FolderIcon,
  File as FileIcon,
  Upload,
  Plus,
  Trash2,
  Edit,
  Eye,
  FolderPlus,
  FileText,
  Image as ImageIcon,
} from "lucide-react";

// Simple checkbox component
const Checkbox = ({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (checked: boolean) => void }) => (
  <input
    type="checkbox"
    checked={checked}
    onChange={(e) => onCheckedChange(e.target.checked)}
    className="h-4 w-4 rounded border-gray-300"
  />
);

export default function DocumentsPage() {
  const { user } = useAuth();
  const [folderList, setFolderList] = useState<Folder[]>([]);
  const [documentList, setDocumentList] = useState<ManagedDocument[]>([]);
  const [userList, setUserList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  // Dialog states
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);

  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load folders and documents for all users
      // Backend already filters by access permissions
      const [foldersData, docsData] = await Promise.all([
        folders.list(), // Returns only accessible folders
        documents.list(),
      ]);
      setFolderList(foldersData);
      setDocumentList(docsData);

      // Load users list if admin
      if (isAdmin) {
        const { users: usersData } = await users.list();
        setUserList(usersData);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = async (doc: ManagedDocument) => {
    try {
      const result = await documents.getViewUrl(doc.id);
      // Open in new tab instead of dialog
      window.open(result.url, "_blank");
    } catch (error) {
      console.error("Failed to get view URL:", error);
      alert("Failed to load document");
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      await documents.delete(id);
      await loadData();
    } catch (error) {
      console.error("Failed to delete document:", error);
      alert("Failed to delete document");
    }
  };

  const handleDeleteFolder = async (id: string) => {
    if (!confirm("Are you sure? This will delete all documents in this folder.")) return;
    try {
      await folders.delete(id);
      await loadData();
    } catch (error: any) {
      alert(error.message || "Failed to delete folder");
    }
  };

  // Get documents in selected folder or root
  const filteredDocuments = selectedFolder
    ? documentList.filter((d) => d.folderId === selectedFolder)
    : documentList.filter((d) => !d.folderId);

  // Get subfolders of selected folder or root folders
  const filteredFolders = selectedFolder
    ? folderList.filter((f) => f.parentId === selectedFolder)
    : folderList.filter((f) => !f.parentId);

  const selectedFolderData = selectedFolder
    ? folderList.find((f) => f.id === selectedFolder)
    : null;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return <ImageIcon className="h-8 w-8 text-blue-500" />;
    if (fileType === "application/pdf") return <FileText className="h-8 w-8 text-red-500" />;
    return <FileIcon className="h-8 w-8 text-gray-500" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-gray-600 mt-1">
            {isAdmin
              ? "Manage folders and documents"
              : "View documents shared with you"}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button onClick={() => setCreateFolderDialogOpen(true)}>
              <FolderPlus className="mr-2 h-4 w-4" />
              New Folder
            </Button>
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
          </div>
        )}
      </div>

      {/* Breadcrumb - All users can see it */}
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
        <button
          onClick={() => setSelectedFolder(null)}
          className="hover:text-blue-600 font-medium"
        >
          Root
        </button>
        {selectedFolderData && (
          <>
            <span>/</span>
            <span className="text-gray-900 font-medium">{selectedFolderData.name}</span>
          </>
        )}
      </div>

      {/* Folders Grid - All users can see folders */}
      {filteredFolders.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Folders</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredFolders.map((folder) => (
              <Card
                key={folder.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedFolder(folder.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <FolderIcon className="h-10 w-10 text-yellow-500" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{folder.name}</h3>
                        <p className="text-xs text-gray-500">
                          {folder.type === "PERSONAL" ? "🔒 Personal" : "👥 Shared"}
                        </p>
                      </div>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(folder.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Documents Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-3">
          Documents {filteredDocuments.length > 0 && `(${filteredDocuments.length})`}
        </h2>
        {filteredDocuments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <FileIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No documents in this folder</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map((doc) => (
              <Card key={doc.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div>{getFileIcon(doc.fileType)}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{doc.name}</h3>
                      <p className="text-xs text-gray-500">{formatFileSize(doc.fileSize)}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {doc.type === "PERSONAL" ? "🔒 Personal" : "👥 Shared"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDocument(doc)}
                      className="flex-1"
                    >
                      <Eye className="mr-1 h-3 w-3" />
                      View
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteDocument(doc.id)}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <UploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        folders={folderList}
        users={userList}
        currentFolder={selectedFolder}
        onSuccess={loadData}
      />

      {/* Create Folder Dialog */}
      <CreateFolderDialog
        open={createFolderDialogOpen}
        onOpenChange={setCreateFolderDialogOpen}
        folders={folderList}
        users={userList}
        currentFolder={selectedFolder}
        onSuccess={loadData}
      />
    </div>
  );
}

// Upload Dialog Component
function UploadDialog({
  open,
  onOpenChange,
  folders: folderList,
  users: userList,
  currentFolder,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: Folder[];
  users: User[];
  currentFolder: string | null;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<"SHARED" | "PERSONAL">("SHARED");
  const [folderId, setFolderId] = useState<string | null>(currentFolder);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Get current folder data to determine smart defaults
  const currentFolderData = currentFolder ? folderList.find(f => f.id === currentFolder) : null;
  const isInPersonalFolder = currentFolderData?.type === "PERSONAL";
  const isInSharedFolder = currentFolderData?.type === "SHARED";
  const isAtRoot = !currentFolder;

  useEffect(() => {
    setFolderId(currentFolder);

    // Smart defaults based on current location
    if (isInPersonalFolder) {
      // Inside PERSONAL folder → force PERSONAL type
      console.log("[Upload] Inside PERSONAL folder, forcing PERSONAL type");
      setType("PERSONAL");
      setSelectedUsers([]);
    } else if (isInSharedFolder && currentFolderData?.sharedWithUsers) {
      // Inside SHARED folder → inherit folder's sharing
      console.log("[Upload] Inside SHARED folder, inheriting users:", currentFolderData.sharedWithUsers.map(u => u.fullName));
      setType("SHARED");
      setSelectedUsers(currentFolderData.sharedWithUsers.map(u => u.id));
    } else {
      // At root → default to SHARED, empty users
      console.log("[Upload] At root, defaulting to SHARED with no users");
      setType("SHARED");
      setSelectedUsers([]);
    }
  }, [currentFolder, currentFolderData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    try {
      setUploading(true);
      console.log("Uploading document with users:", selectedUsers);
      await documents.upload({
        file,
        name: name || file.name,
        type,
        folderId: folderId ?? undefined,
        sharedWithUserIds: type === "SHARED" ? selectedUsers : undefined,
      });
      onOpenChange(false);
      onSuccess();
      // Reset form
      setFile(null);
      setName("");
      setType("SHARED");
      setSelectedUsers([]);
    } catch (error: any) {
      alert(error.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a document (max 10MB, txt/pdf/png/jpg/jpeg)
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label>File</Label>
              <Input
                type="file"
                accept=".txt,.pdf,.png,.jpg,.jpeg"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
              />
            </div>
            <div>
              <Label>Name (optional)</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Leave empty to use filename"
              />
            </div>

            {/* Type selection - Only show at root */}
            {isAtRoot && (
              <div>
                <Label>Type</Label>
                <Select value={type} onValueChange={(v: any) => setType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SHARED">👥 Shared</SelectItem>
                    <SelectItem value="PERSONAL">🔒 Personal (Admin Only)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Show folder type info when inside a folder */}
            {!isAtRoot && (
              <div className="border rounded p-2 bg-blue-50 text-sm text-blue-900">
                <p className="font-medium">
                  {isInPersonalFolder && "🔒 Personal Folder - Document will be private (Admin only)"}
                  {isInSharedFolder && "👥 Shared Folder - Document will inherit folder sharing"}
                </p>
              </div>
            )}
            <div>
              <Label>Folder</Label>
              {currentFolder ? (
                <div className="border rounded p-2 bg-gray-50 text-sm text-gray-700">
                  📁 {folderList.find(f => f.id === currentFolder)?.name || "Current Folder"}
                  <p className="text-xs text-gray-500 mt-1">Document will be uploaded to this folder</p>
                </div>
              ) : (
                <Select value={folderId || "none"} onValueChange={(v) => setFolderId(v === "none" ? null : v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">📁 Root</SelectItem>
                    {folderList.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* User selection - Only show at root for SHARED type OR hide when in shared folder */}
            {type === "SHARED" && isAtRoot && (
              <div>
                <Label>Share with Users</Label>
                <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-2">
                  {userList.filter(u => u.role !== "ADMIN").map((u) => (
                    <div key={u.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedUsers.includes(u.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedUsers([...selectedUsers, u.id]);
                          } else {
                            setSelectedUsers(selectedUsers.filter((id) => id !== u.id));
                          }
                        }}
                      />
                      <span className="text-sm">{u.fullName} ({u.role})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Show inherited users when in shared folder */}
            {isInSharedFolder && currentFolderData?.sharedWithUsers && currentFolderData.sharedWithUsers.length > 0 && (
              <div>
                <Label>Shared with (inherited from folder)</Label>
                <div className="border rounded p-2 bg-gray-50 text-sm text-gray-700">
                  {currentFolderData.sharedWithUsers.map(u => u.fullName).join(", ")}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!file || uploading}>
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Create Folder Dialog Component
function CreateFolderDialog({
  open,
  onOpenChange,
  folders: folderList,
  users: userList,
  currentFolder,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: Folder[];
  users: User[];
  currentFolder: string | null;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"SHARED" | "PERSONAL">("SHARED");
  const [parentId, setParentId] = useState<string | null>(currentFolder);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // Get parent folder data to determine smart defaults
  const parentFolderData = currentFolder ? folderList.find(f => f.id === currentFolder) : null;
  const isInPersonalFolder = parentFolderData?.type === "PERSONAL";
  const isInSharedFolder = parentFolderData?.type === "SHARED";
  const isAtRoot = !currentFolder;

  useEffect(() => {
    setParentId(currentFolder);

    // Smart defaults based on parent location
    if (isInPersonalFolder) {
      // Inside PERSONAL folder → force PERSONAL type
      setType("PERSONAL");
      setSelectedUsers([]);
    } else if (isInSharedFolder && parentFolderData?.sharedWithUsers) {
      // Inside SHARED folder → inherit folder's sharing
      setType("SHARED");
      setSelectedUsers(parentFolderData.sharedWithUsers.map(u => u.id));
    } else {
      // At root → default to SHARED, empty users
      setType("SHARED");
      setSelectedUsers([]);
    }
  }, [currentFolder, parentFolderData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setCreating(true);
      await folders.create({
        name,
        type,
        parentId: parentId ?? undefined,
        sharedWithUserIds: type === "SHARED" ? selectedUsers : undefined,
      });
      onOpenChange(false);
      onSuccess();
      // Reset form
      setName("");
      setType("SHARED");
      setSelectedUsers([]);
    } catch (error: any) {
      alert(error.message || "Failed to create folder");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Folder</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label>Folder Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Employee Documents"
                required
              />
            </div>

            {/* Type selection - Only show at root */}
            {isAtRoot && (
              <div>
                <Label>Type</Label>
                <Select value={type} onValueChange={(v: any) => setType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SHARED">👥 Shared</SelectItem>
                    <SelectItem value="PERSONAL">🔒 Personal (Admin Only)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Show parent folder type info when inside a folder */}
            {!isAtRoot && (
              <div className="border rounded p-2 bg-blue-50 text-sm text-blue-900">
                <p className="font-medium">
                  {isInPersonalFolder && "🔒 Creating in Personal Folder - Subfolder will be private"}
                  {isInSharedFolder && "👥 Creating in Shared Folder - Subfolder will inherit sharing"}
                </p>
              </div>
            )}
            <div>
              <Label>Parent Folder</Label>
              {currentFolder ? (
                <div className="border rounded p-2 bg-gray-50 text-sm text-gray-700">
                  📁 {folderList.find(f => f.id === currentFolder)?.name || "Current Folder"}
                  <p className="text-xs text-gray-500 mt-1">Subfolder will be created inside this folder</p>
                </div>
              ) : (
                <Select value={parentId || "none"} onValueChange={(v) => setParentId(v === "none" ? null : v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">📁 Root</SelectItem>
                    {folderList.filter(f => {
                      // Don't allow more than 2 levels of nesting
                      if (!f.parentId) return true;
                      const parent = folderList.find(p => p.id === f.parentId);
                      return !parent?.parentId; // Only show level 1 and 2 folders
                    }).map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.parentId ? "  └─ " : ""}{f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* User selection - Only show at root for SHARED type */}
            {type === "SHARED" && isAtRoot && (
              <div>
                <Label>Share with Users</Label>
                <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-2">
                  {userList.filter(u => u.role !== "ADMIN").map((u) => (
                    <div key={u.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedUsers.includes(u.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedUsers([...selectedUsers, u.id]);
                          } else {
                            setSelectedUsers(selectedUsers.filter((id) => id !== u.id));
                          }
                        }}
                      />
                      <span className="text-sm">{u.fullName} ({u.role})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Show inherited users when creating inside shared folder */}
            {isInSharedFolder && parentFolderData?.sharedWithUsers && parentFolderData.sharedWithUsers.length > 0 && (
              <div>
                <Label>Will be shared with (inherited from parent folder)</Label>
                <div className="border rounded p-2 bg-gray-50 text-sm text-gray-700">
                  {parentFolderData.sharedWithUsers.map(u => u.fullName).join(", ")}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name || creating}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
