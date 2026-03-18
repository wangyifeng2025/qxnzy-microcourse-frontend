import Link from "next/link";
import { Play, Star, Users, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getCoverGradient, STATUS_LABEL, type Course } from "@/lib/courses";
import { cn } from "@/lib/utils";

export interface CourseCardProps {
  course: Course;
  instructor?: string;
  rating?: number;
  views?: string;
  isNew?: boolean;
  isHot?: boolean;
}

export default function CourseCard({
  course,
  instructor,
  rating,
  views,
  isNew,
  isHot,
}: CourseCardProps) {
  const { id, title, description, cover_image_url, status } = course;
  const gradient = getCoverGradient(id);
  const statusInfo = STATUS_LABEL[status] ?? STATUS_LABEL.Draft;
  const hasCover = !!cover_image_url && !cover_image_url.includes("example.com");

  return (
    <Link href={`/courses/${id}`} className="block">
    <Card className="group overflow-hidden border-gray-100 hover:border-blue-200 hover:shadow-md hover:shadow-blue-50/60 transition-all duration-200 cursor-pointer py-0 gap-0">
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-gray-100">
        {hasCover ? (
          <div
            className="w-full h-full bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
            style={{ backgroundImage: `url(${cover_image_url})` }}
          />
        ) : (
          <div
            className={cn(
              "w-full h-full bg-linear-to-br flex items-center justify-center transition-transform duration-300 group-hover:scale-105",
              gradient
            )}
          >
            <FileText size={32} className="text-white/60" />
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-all duration-200 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-white/95 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md scale-90 group-hover:scale-100">
            <Play size={16} className="text-blue-600 ml-0.5" fill="currentColor" />
          </div>
        </div>

        {/* Top-left badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          {isNew && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white">
              NEW
            </span>
          )}
          {isHot && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-500 text-white">
              🔥 热门
            </span>
          )}
        </div>
      </div>

      <CardContent className="p-4">
        {/* Status badge */}
        <div className="flex items-center gap-2 mb-2">
          <Badge
            variant="secondary"
            className={cn("text-[11px] font-medium px-2 py-0 h-5 border-0", statusInfo.color)}
          >
            {statusInfo.label}
          </Badge>
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2 mb-2 group-hover:text-blue-700 transition-colors">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-xs text-gray-400 line-clamp-2 mb-3 leading-relaxed">
            {description}
          </p>
        )}

        {/* Instructor */}
        {instructor && (
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-linear-to-br from-blue-400 to-sky-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
              {instructor.charAt(0)}
            </div>
            <span className="text-xs text-gray-500 truncate">{instructor}</span>
          </div>
        )}

        {/* Stats */}
        {(rating !== undefined || views) && (
          <div className="flex items-center justify-between pt-3 border-t border-gray-50">
            {rating !== undefined ? (
              <div className="flex items-center gap-1">
                <Star size={12} className="text-amber-400" fill="currentColor" />
                <span className="text-xs font-semibold text-gray-700">{rating.toFixed(1)}</span>
              </div>
            ) : (
              <span />
            )}
            {views && (
              <div className="flex items-center gap-1 text-gray-400">
                <Users size={11} />
                <span className="text-xs">{views}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
    </Link>
  );
}
