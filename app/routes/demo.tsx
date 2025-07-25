import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Switch } from "~/components/ui/switch";
import { Checkbox } from "~/components/ui/checkbox";
import { Progress } from "~/components/ui/progress";
import { Separator } from "~/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import {
  ArrowLeft,
  Settings,
  User,
  BarChart3,
  TrendingUp,
  DollarSign,
  Activity,
  Users,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Star,
  Heart,
  Share2,
  MoreHorizontal,
} from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTrigger,
} from "~/components/ui/sheet";

export const meta: MetaFunction = () => {
  return [
    { title: "Component Demo - Dashboard UI" },
    {
      name: "description",
      content: "Comprehensive demo of all themed shadcn components",
    },
  ];
};

export default function Demo() {
  return (
    <div className="min-h-screen dashboard-gradient bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">Component Demo</h1>
              <p className="text-gray-300">
                All shadcn components with dashboard theming
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="card-gradient-green text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 opacity-90" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$45,231.89</div>
              <p className="text-xs opacity-90">+20.1% from last month</p>
            </CardContent>
          </Card>

          <Card className="card-gradient-orange text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">
                Subscriptions
              </CardTitle>
              <Users className="h-4 w-4 opacity-90" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+2,350</div>
              <p className="text-xs opacity-90">+180.1% from last month</p>
            </CardContent>
          </Card>

          <Card className="card-gradient-red text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">
                Sales
              </CardTitle>
              <BarChart3 className="h-4 w-4 opacity-90" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+12,234</div>
              <p className="text-xs opacity-90">+19% from last month</p>
            </CardContent>
          </Card>

          <Card className="card-gradient-teal text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">
                Active Now
              </CardTitle>
              <Activity className="h-4 w-4 opacity-90" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+573</div>
              <p className="text-xs opacity-90">+201 since last hour</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Forms & Inputs */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">Forms & Inputs</CardTitle>
              <CardDescription>
                Various input components and form controls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Email
                </label>
                <Input
                  placeholder="Enter your email"
                  className="bg-dashboard-card border-gray-600 text-white placeholder:text-gray-400"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Message
                </label>
                <Textarea
                  placeholder="Type your message here"
                  className="bg-dashboard-card border-gray-600 text-white placeholder:text-gray-400"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Category
                </label>
                <Select>
                  <SelectTrigger className="bg-dashboard-card border-gray-600 text-white">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover text-foreground">
                    <SelectItem value="sports">Sports</SelectItem>
                    <SelectItem value="gaming">Gaming</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="terms" className="border-gray-600" />
                <label htmlFor="terms" className="text-sm text-gray-300">
                  Accept terms and conditions
                </label>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">
                  Notifications
                </label>
                <Switch />
              </div>

              <div className="flex gap-2">
                <Button className="bg-dashboard-green hover:bg-dashboard-green/90">
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  className="border-gray-600 text-white hover:bg-white/10"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabs & Progress */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">Tabs & Progress</CardTitle>
              <CardDescription>
                Tabbed content and progress indicators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-dashboard-card">
                  <TabsTrigger
                    value="overview"
                    className="data-[state=active]:bg-dashboard-green"
                  >
                    Overview
                  </TabsTrigger>
                  <TabsTrigger
                    value="analytics"
                    className="data-[state=active]:bg-dashboard-orange"
                  >
                    Analytics
                  </TabsTrigger>
                  <TabsTrigger
                    value="reports"
                    className="data-[state=active]:bg-dashboard-teal"
                  >
                    Reports
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Revenue Growth</span>
                      <span className="text-dashboard-green">75%</span>
                    </div>
                    <Progress value={75} className="bg-gray-700" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">User Acquisition</span>
                      <span className="text-dashboard-orange">60%</span>
                    </div>
                    <Progress value={60} className="bg-gray-700" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">
                        Customer Satisfaction
                      </span>
                      <span className="text-dashboard-teal">90%</span>
                    </div>
                    <Progress value={90} className="bg-gray-700" />
                  </div>
                </TabsContent>

                <TabsContent value="analytics" className="mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 rounded-lg bg-dashboard-card">
                      <TrendingUp className="h-8 w-8 text-dashboard-orange mx-auto mb-2" />
                      <div className="text-2xl font-bold text-white">24.7K</div>
                      <div className="text-sm text-gray-400">Page Views</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-dashboard-card">
                      <Users className="h-8 w-8 text-dashboard-teal mx-auto mb-2" />
                      <div className="text-2xl font-bold text-white">3.2K</div>
                      <div className="text-sm text-gray-400">Active Users</div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="reports" className="mt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-dashboard-card">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-dashboard-green" />
                        <span className="text-white">Monthly Report</span>
                      </div>
                      <Badge className="bg-dashboard-green text-white">
                        Ready
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-dashboard-card">
                      <div className="flex items-center gap-3">
                        <BarChart3 className="h-4 w-4 text-dashboard-orange" />
                        <span className="text-white">Analytics Report</span>
                      </div>
                      <Badge variant="secondary">Processing</Badge>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Badges & Alerts */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">Badges & Alerts</CardTitle>
              <CardDescription>
                Status indicators and alert dialogs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-300">
                  Status Badges
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-dashboard-green text-white">
                    Active
                  </Badge>
                  <Badge className="bg-dashboard-orange text-white">
                    Pending
                  </Badge>
                  <Badge className="bg-dashboard-red text-white">Error</Badge>
                  <Badge className="bg-dashboard-teal text-white">
                    Success
                  </Badge>
                  <Badge className="bg-dashboard-yellow text-black">
                    Warning
                  </Badge>
                  <Badge variant="secondary">Inactive</Badge>
                </div>
              </div>

              <Separator className="bg-gray-700" />

              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-300">
                  Alert Dialogs
                </div>
                <div className="flex gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="bg-dashboard-red hover:bg-dashboard-red/90">
                        Delete Item
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently
                          delete the item.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-dashboard-red hover:bg-dashboard-red/90">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <Sheet>
                    <SheetTrigger>
                      <Button className="bg-dashboard-red hover:bg-dashboard-red/90">
                        View Sheet
                      </Button>
                    </SheetTrigger>
                    <SheetContent>
                      <SheetHeader>
                        <SheetClose />
                      </SheetHeader>
                      <SheetDescription>A seet component</SheetDescription>
                      <SheetFooter>Bottom of the sheet</SheetFooter>
                    </SheetContent>
                  </Sheet>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          className="border-gray-600 text-white hover:bg-white/10"
                        >
                          <Heart className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Add to favorites</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interactive Elements */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">Interactive Elements</CardTitle>
              <CardDescription>
                Buttons, dropdowns, and other interactive components
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-300">
                  Button Variants
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button className="bg-dashboard-green hover:bg-dashboard-green/90">
                    Primary
                  </Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button
                    variant="outline"
                    className="border-gray-600 text-white hover:bg-white/10"
                  >
                    Outline
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-white hover:bg-white/10"
                  >
                    Ghost
                  </Button>
                </div>
              </div>

              <Separator className="bg-gray-700" />

              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-300">
                  User Actions
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-dashboard-card">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-dashboard-green flex items-center justify-center">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="text-white font-medium">John Doe</div>
                        <div className="text-gray-400 text-sm">
                          john@example.com
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:bg-white/10"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Mail className="mr-2 h-4 w-4" />
                          Send Email
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Phone className="mr-2 h-4 w-4" />
                          Call User
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
                          Block User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-dashboard-card">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-dashboard-orange flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="text-white font-medium">
                          New York Office
                        </div>
                        <div className="text-gray-400 text-sm">
                          123 Business Ave
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:bg-white/10"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:bg-white/10"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
