<?php

use App\Enums\ProjectPriority;
use App\Enums\ProjectStatus;
use App\Models\Project;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('client_name', Project::CLIENT_NAME_MAX_LENGTH);
            $table->string('project_name', Project::PROJECT_NAME_MAX_LENGTH);
            $table->text('description')->nullable();
            $table->enum('status', ProjectStatus::values())->index();
            $table->enum('priority', ProjectPriority::values())->index();
            $table->date('start_date')->nullable();
            $table->date('due_date')->nullable()->index();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
