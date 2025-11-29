import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, Menu, X, Home, Clock, Heart, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  onSearch: (query: string) => void;
  initialQuery?: string;
}

export function Header({ onSearch, initialQuery = "" }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [, navigate] = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-14 items-center gap-4 px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5 text-primary-foreground"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
            </svg>
          </div>
          <span
            className="hidden font-semibold text-lg md:inline-block text-foreground"
            data-testid="text-logo"
          >
            LiteTube
          </span>
        </Link>

        <form
          onSubmit={handleSearch}
          className="flex flex-1 max-w-2xl mx-auto"
        >
          <div className="relative flex w-full">
            <Input
              type="search"
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-r-none border-r-0 bg-card focus-visible:ring-primary"
              data-testid="input-search"
            />
            <Button
              type="submit"
              variant="secondary"
              className="rounded-l-none px-4"
              data-testid="button-search"
            >
              <Search className="h-4 w-4" />
              <span className="sr-only">Search</span>
            </Button>
          </div>
        </form>

        <nav className="hidden md:flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/" data-testid="link-home">
              <Home className="h-5 w-5" />
              <span className="sr-only">Home</span>
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/history" data-testid="link-history">
              <Clock className="h-5 w-5" />
              <span className="sr-only">History</span>
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/favorites" data-testid="link-favorites">
              <Heart className="h-5 w-5" />
              <span className="sr-only">Favorites</span>
            </Link>
          </Button>
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              data-testid="button-mobile-menu"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/" className="flex items-center gap-2 w-full">
                <Home className="h-4 w-4" />
                Home
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/history" className="flex items-center gap-2 w-full">
                <Clock className="h-4 w-4" />
                History
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/favorites" className="flex items-center gap-2 w-full">
                <Heart className="h-4 w-4" />
                Favorites
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
