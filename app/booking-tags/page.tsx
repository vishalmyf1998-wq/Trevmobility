"use client"

import { useState } from "react"
import { useAdmin } from "@/lib/admin-context"
import { BookingTag } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Field, FieldLabel } from "@/components/ui/field"
import { toast } from "sonner"
import { Plus, MoreHorizontal, Pencil, Trash2, Tag } from "lucide-react"

type TagFormData = Omit<BookingTag, 'id'>

const colorOptions = [
  { value: '#FFD700', label: 'Gold' },
  { value: '#4169E1', label: 'Royal Blue' },
  { value: '#32CD32', label: 'Lime Green' },
  { value: '#FF4500', label: 'Orange Red' },
  { value: '#9370DB', label: 'Medium Purple' },
  { value: '#FF69B4', label: 'Hot Pink' },
  { value: '#20B2AA', label: 'Light Sea Green' },
  { value: '#DC143C', label: 'Crimson' },
  { value: '#8B4513', label: 'Saddle Brown' },
  { value: '#2F4F4F', label: 'Dark Slate Gray' },
]

const initialFormData: TagFormData = {
  name: '',
  color: '#4169E1',
  description: '',
}

export default function BookingTagsPage() {
  const { 
    bookingTags, bookings,
    addBookingTag, updateBookingTag, deleteBookingTag 
  } = useAdmin()
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<BookingTag | null>(null)
  const [formData, setFormData] = useState<TagFormData>(initialFormData)
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (editingTag) {
      updateBookingTag(editingTag.id, formData)
      toast.success('Tag updated successfully')
    } else {
      addBookingTag(formData)
      toast.success('Tag created successfully')
    }
    
    setIsDialogOpen(false)
    setEditingTag(null)
    setFormData(initialFormData)
  }
  
  const handleEdit = (tag: BookingTag) => {
    setEditingTag(tag)
    setFormData({
      name: tag.name,
      color: tag.color,
      description: tag.description || '',
    })
    setIsDialogOpen(true)
  }
  
  const handleDelete = (id: string) => {
    deleteBookingTag(id)
    toast.success('Tag deleted successfully')
  }
  
  const getTagUsageCount = (tagId: string) => {
    return bookings.filter(b => b.tags?.includes(tagId)).length
  }
  
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Booking Tags</h1>
          <p className="text-muted-foreground">Configure special tags for booking identification</p>
        </div>
        <Button onClick={() => {
          setEditingTag(null)
          setFormData(initialFormData)
          setIsDialogOpen(true)
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Tag
        </Button>
      </div>
      
      {/* Tags Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {bookingTags.map((tag) => (
          <Card key={tag.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${tag.color}20` }}
                  >
                    <Tag className="h-5 w-5" style={{ color: tag.color }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block px-2 py-1 text-xs font-medium rounded-full"
                        style={{ 
                          backgroundColor: `${tag.color}20`, 
                          color: tag.color,
                          border: `1px solid ${tag.color}40`
                        }}
                      >
                        {tag.name}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Used in {getTagUsageCount(tag.id)} bookings
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(tag)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDelete(tag.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {tag.description && (
                <p className="text-sm text-muted-foreground mt-3">{tag.description}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Usage Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How to use tags</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>Tags can be added to bookings from the booking details or actions menu</li>
            <li>Use tags to categorize bookings for easy filtering and reporting</li>
            <li>Common uses: VIP customers, corporate bookings, urgent requests, special events</li>
            <li>Tags are visible to operators and can be used in reports</li>
          </ul>
        </CardContent>
      </Card>
      
      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTag ? 'Edit Tag' : 'Create Tag'}</DialogTitle>
            <DialogDescription>
              Configure a tag for categorizing bookings
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field>
              <FieldLabel>Tag Name *</FieldLabel>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., VIP, Urgent, Corporate"
                required
              />
            </Field>
            
            <Field>
              <FieldLabel>Color *</FieldLabel>
              <div className="grid grid-cols-5 gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`h-10 rounded-lg border-2 transition-all ${
                      formData.color === color.value ? 'border-foreground scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    title={color.label}
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="h-10 w-20 p-1"
                />
                <span className="text-sm text-muted-foreground">Or pick a custom color</span>
              </div>
            </Field>
            
            <Field>
              <FieldLabel>Description</FieldLabel>
              <Input
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description for this tag"
              />
            </Field>
            
            <div className="pt-2">
              <p className="text-sm text-muted-foreground">Preview:</p>
              <div className="mt-2">
                <span
                  className="inline-block px-3 py-1.5 text-sm font-medium rounded-full"
                  style={{ 
                    backgroundColor: `${formData.color}20`, 
                    color: formData.color,
                    border: `1px solid ${formData.color}40`
                  }}
                >
                  {formData.name || 'Tag Name'}
                </span>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingTag ? 'Update' : 'Create'} Tag
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
